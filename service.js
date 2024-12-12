const express = require("express");
const bodyParser = require("body-parser");
const soap = require("soap");
const { createReadStream, readFileSync } = require("fs");
const readline = require("readline");
const util = require("util");
const winston = require("winston");
const path = require("path");
const WebSocket = require("ws");
require("winston-daily-rotate-file");

const app = express();
const port = 2000; // You can use any port that suits your setup

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: "api_logs.log" }),
    new winston.transports.DailyRotateFile({
      filename: "logs/api-%DATE%.log",
      datePattern: "YYYY-MM",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "12",
      createSymlink: true,
      symlinkName: "api_logs.log",
    }),
  ],
});

async function processLogs(options = {}) {
  const { page = 1, limit = 10, level, search, startDate, endDate } = options;

  const logs = [];
  let totalLogs = 0;
  let skippedLogs = 0;
  const skip = (page - 1) * limit;

  // Determine start and end dates
  const currentDate = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const end = endDate
    ? new Date(endDate)
    : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Generate log files for the date range
  const currentMonth = new Date(start);
  while (currentMonth <= end) {
    const logFilePath = `./logs/api-${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}.log`;
    console.log(logFilePath);
    const fileStream = createReadStream(logFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      try {
        const log = JSON.parse(line);
        // Apply filters
        if (level && log.level !== level) continue;
        if (
          search &&
          !JSON.stringify(log).toLowerCase().includes(search.toLowerCase())
        )
          continue;
        if (startDate && new Date(log.timestamp) < start) continue;
        if (endDate && new Date(log.timestamp) > end) continue;

        totalLogs++;

        if (skippedLogs < skip) {
          skippedLogs++;
          continue;
        }

        if (logs.length < limit) {
          logs.push(log);
        }
      } catch (error) {
        console.error("Error parsing log line:", error);
        continue;
      }
    }

    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return {
    data: logs.reverse(),
    total: totalLogs,
    page: page,
    limit: limit,
    totalPages: Math.ceil(totalLogs / limit),
  };
}
app.use(bodyParser.json()); // Middleware to parse JSON bodies
app.use(express.static(path.join(__dirname, 'client/build')));
// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.post("/service", (req, res) => {
  const { url, args, methodName } = req.body;

  logger.info("Received SOAP service request", {
    url,
    methodName,
    args: JSON.stringify(args),
  });

  // Validate input
  if (!url || !args || !methodName) {
    logger.warn("Missing required fields for SOAP request", {
      url,
      args,
      methodName,
    });
    return res
      .status(400)
      .json({ error: "Missing required fields: url, args, methodName" });
  }

  logger.info("Creating SOAP client", { url });

  // Create a SOAP client and execute the provided method
  soap.createClient(url, (err, client) => {
    if (err) {
      logger.error("Error creating SOAP client", {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({
        error: "Error creating SOAP client",
        details: util.inspect(err, { depth: null }).split("\n")[0],
      });
    }

    logger.info("SOAP client created successfully", { url });

    // Dynamically call the method on the client
    if (typeof client[methodName] === "function") {
      logger.info("Calling SOAP method", {
        methodName,
        args: JSON.stringify(args),
      });

      client[methodName](args, (err, result) => {
        if (err) {
          logger.error("Error calling SOAP method", {
            methodName,
            error: err.message,
            stack: err.stack,
          });
          return res.status(500).json({
            error: "Error calling SOAP method",
            details: util.inspect(err, { depth: null }).split("\n")[0],
          });
        }

        logger.info("SOAP method called successfully", {
          methodName,
          result: JSON.stringify(result),
        });

        res.json(result);
      });
    } else {
      logger.warn("Requested SOAP method not found", { methodName });
      res
        .status(400)
        .json({ error: `Method ${methodName} not found on SOAP client` });
    }
  });
});

app.post("/api", (req, res) => {
  logger.info("Received API request", { body: req.body });

  const { url, args } = req.body;

  // Validate input
  if (!url || !args || !args.login) {
    logger.error("Missing required fields", { url, args });
    return res.status(400).json({
      success: false,
      result: "Missing required fields: url, args, args.login",
    });
  }

  logger.info("Sending request to external API", { url, args });

  fetch(url, {
    headers: new Headers({
      Authorization:
        "Basic " + btoa(`${args.login.userName}:${args.login.password}`),
      "Content-Type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify({ ...args, login: undefined }),
  })
    .then(async (response) => {
      const responseText = await response.text();
      logger.info("Received response from external API", {
        status: response.status,
        data: responseText,
      });

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        logger.error("Failed to parse response as JSON", {
          error: error.message,
          responseText,
        });
        throw new Error("Invalid JSON response");
      }

      if (!response.ok) {
        logger.error("API request failed", {
          status: response.status,
          data,
        });
        throw new Error(
          `API request failed with status ${response.status}`,
          data
        );
      }

      return data;
    })
    .then((data) => {
      logger.info("Successfully processed external API response", { data });
      res.json({ success: true, result: data });
    })
    .catch((error) => {
      logger.error("Error occurred while processing request", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ success: false, result: error });
    });
});

app.get("/logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const { level, search, startDate, endDate } = req.query;

    res.json(
      await processLogs({
        level,
        search,
        startDate,
        endDate,
        page,
        limit,
      })
    );
  } catch (error) {
    console.error("Error processing logs:", error);
    res.status(500).json({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  }
});

app.get("/logs-ui", async (req, res) => {
   // Simple authentication check
   const auth = req.query.auth;
   if (!auth || auth!== "dabeer") {
     return res.status(401).send("Unauthorized"); // This triggers the browser popup
   }
 
  try {
    // Get initial logs
    const initialLogs = await processLogs();

    // Read the HTML template
    const template = readFileSync(
      path.join(__dirname, "client/build/index.html"),
      "utf8"
    );

    // Insert the initial logs data
    const html = template.replace(
      '<div id="root"></div>',
      `<div id="root"></div>
       <script>
         window.__INITIAL_LOGS__ = ${JSON.stringify(initialLogs)};
       </script>`
    );

    res.send(html);
  } catch (error) {
    console.error("Error serving logs UI:", error);
    res.status(500).send("Error loading logs viewer");
  }
});

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", async (ws) => {
  console.log("WebSocket connection established");

  // Send a test message immediately
  ws.send(JSON.stringify(await processLogs()));

  ws.on("message", async (message) => {
    console.log("Message received from client:", message);

    try {
      console.log("Message received:", message);
      const filters = JSON.parse(message);
      const logs = await processLogs(filters);
      ws.send(JSON.stringify(logs));
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`WebSocket closed: Code=${code}, Reason=${reason}`);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  logger.info(`Server running on port ${port}`);
});

server.on("upgrade", (request, socket, head) => {
  // Confirm the upgrade process is being invoked.
  console.log("Upgrade request received");

  wss.handleUpgrade(request, socket, head, (ws) => {
    console.log("Connection upgraded");
    wss.emit("connection", ws, request);
  });
});
