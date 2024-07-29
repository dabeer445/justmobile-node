const express = require("express");
const bodyParser = require("body-parser");
const soap = require("soap");
const app = express();
const port = 2000; // You can use any port that suits your setup
const util = require('util');

app.use(bodyParser.json()); // Middleware to parse JSON bodies

// app.post("/service", (req, res) => {
//   const { url, args, methodName } = req.body;
//   console.log("GOT REQUEST: ", url);
//   // Validate input
//   if (!url || !args || !methodName) {
//     return res
//       .status(400)
//       .send("Missing required fields: url, args, methodName");
//   }

//   // Create a SOAP client and execute the provided method
//   soap.createClient(url, (err, client) => {
//     if (err) {
//       console.error("Error creating SOAP client:", err);
//       return res.status(500).send("Error creating SOAP client");
//     }

//     // Dynamically call the method on the client
//     if (typeof client[methodName] === "function") {
//       client[methodName](args, (err, result) => {
//         if (err) {
//           console.error("Error calling SOAP method:", err);
//           return res.status(500).send(`Error calling SOAP method ${err}`);
//         }
//         res.json(result);
//       });
//     } else {
//       res.status(400).send(`Method ${methodName} not found on SOAP client`);
//     }
//   });
// });

app.post("/service", (req, res) => {
  const { url, args, methodName } = req.body;
  console.log(`GOT REQUEST:`);
  console.dir(req.body, {depth:null});

  // Validate input
  if (!url || !args || !methodName) {
    return res.status(400).json({ error: "Missing required fields: url, args, methodName" });
  }

  // Create a SOAP client and execute the provided method
  soap.createClient(url, (err, client) => {
    if (err) {
      console.error("Error creating SOAP client:", err);
      return res.status(500).json({ error: "Error creating SOAP client", details: util.inspect(err, { depth: null }).split('\n')[0] });
    }
    console.log("No Error creating client")

    // Dynamically call the method on the client
    if (typeof client[methodName] === "function") {
      client[methodName](args, (err, result) => {
        if (err) {
          console.error("Error calling SOAP method:", err);
          // return res.status(500).json({ error: "Error calling SOAP method ASAS"  });
          return res.status(500).json({ error: "Error calling SOAP method", details: util.inspect(err, { depth: null }).split('\n')[0] });
        }
        res.json(result);
      });
    } else {
      res.status(400).json({ error: `Method ${methodName} not found on SOAP client` });
    }
  });
});
// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.post("/api", (req, res) => {
  const { url, args } = req.body;
  // fetch("https://enau4qa3ydyfk.x.pipedream.net/node", {
  //   method: "POST",
  //   body: JSON.stringify(req.body),
  // });

  // Validate input
  if (!url || !args) {
    return res
      .status(400)
      .send("Missing required fields: url, args, methodName");
  }
  fetch(url, {
    headers: new Headers({
      Authorization: "Basic " + btoa("justmobile.api.2:BXKhod9473d@"),
      "Content-Type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify(args),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
      res.json({ success: "true", result: data });
    //   fetch("https://enau4qa3ydyfk.x.pipedream.net/nodeResult", {
    //     method: "POST",
    //     body: JSON.stringify(data),
    //   });
    })
    .catch((error) => {
        // fetch("https://enau4qa3ydyfk.x.pipedream.net/nodeResultError", {
        //     method: "POST",
        //     body: JSON.stringify(error),
        //   });
    
      return res.status(500).send(error);
    });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
