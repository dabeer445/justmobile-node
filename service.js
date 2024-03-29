const express = require('express');
const bodyParser = require('body-parser');
const soap = require('soap');
const app = express();
const port = 2000; // You can use any port that suits your setup

app.use(bodyParser.json()); // Middleware to parse JSON bodies

app.post('/service', (req, res) => {
    const { url, args, methodName } = req.body;
console.log("GOT REQUEST: ", url);
    // Validate input
    if (!url || !args || !methodName) {
        return res.status(400).send('Missing required fields: url, args, methodName');
    }

    // Create a SOAP client and execute the provided method
    soap.createClient(url, (err, client) => {
        if (err) {
            console.error("Error creating SOAP client:", err);
            return res.status(500).send("Error creating SOAP client");
        }

        // Dynamically call the method on the client
        if (typeof client[methodName] === "function") {
            client[methodName](args, (err, result) => {
                if (err) {
                    console.error("Error calling SOAP method:", err);
                    return res.status(500).send(`Error calling SOAP method ${err}`);
                }
                res.json(result);
            });
        } else {
            res.status(400).send(`Method ${methodName} not found on SOAP client`);
        }
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
