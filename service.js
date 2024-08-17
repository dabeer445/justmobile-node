const express = require("express");
const bodyParser = require("body-parser");
const soap = require("soap");
const app = express();
const port = 2000; // You can use any port that suits your setup
const util = require("util");
const winston = require("winston");

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "api_logs.log" }),
  ],
});

app.use(bodyParser.json()); // Middleware to parse JSON bodies

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

// app.post("/api", (req, res) => {
//   logger.info("Received API request", { body: req.body });

//   const { url, args } = req.body;

//   // Validate input
//   if (!url || !args) {
//     logger.error("Missing required fields", { url, args });
//     return res
//       .status(400)
//       .send("Missing required fields: url, args, methodName");
//   }

//   logger.info("Sending request to external API", { url, args });

//   fetch(url, {
//     headers: new Headers({
//       Authorization: "Basic " + btoa("justmobile.api.2:BXKhod9473d@"),
//       "Content-Type": "application/json",
//     }),
//     method: "POST",
//     body: JSON.stringify(args),
//   })
//     .then((response) => {
//       const data = response.json();
//       logger.info("Received response from external API", {
//         status: response.status,
//         data: response.text(),
//       });
//       return data;
//     })
//     .then((data) => {
//       logger.info("Successfully processed external API response", { data });
//       res.json({ success: "true", result: data });
//     })
//     .catch((error) => {
//       logger.error("Error occurred while processing request", {
//         error: error.message,
//         stack: error.stack,
//       });
//       return res.status(500).send(error.message);
//     });
// });

app.post("/api", (req, res) => {
  logger.info("Received API request", { body: req.body });

  const { url, args } = req.body;

  // Validate input
  if (!url || !args) {
    logger.error("Missing required fields", { url, args });
    return res
      .status(400)
      .send("Missing required fields: url, args");
  }

  logger.info("Sending request to external API", { url, args });

  fetch(url, {
    headers: new Headers({
      Authorization: "Basic " + btoa("justmobile.api.2:Nnkd##3ds3fdadg"),
      "Content-Type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify(args),
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
        throw new Error(`API request failed with status ${response.status}`);
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
      return res.status(500).send({ success: true, result: error });
    });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  logger.info(`Server running on port ${port}`);
});
