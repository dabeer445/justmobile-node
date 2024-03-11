const soap = require("soap");
const url = "https://benzine.telcoinabox.com:443/tiab/UtbPooledResource?wsdl";

// SOAP Body
const args = {
  login: {
    password: "Welcome123!",
    userName: "justmobile.api",
  },
  reservePooledResourcesRequest: {
    resourceType: "WME_MSN",
    numResources: 5,
  },
};

// Create a SOAP client with proxy configuration
// soap.createClient(url, options, (err, client) => {
  soap.createClient(url, (err, client) => {
  if (err) {
    console.error("Error creating SOAP client:", err);
    return;
  }

  client.reserveResources(args, (err, result) => {
    if (err) {
      console.error("Error calling SOAP method:", err);
      return;
    }

    console.log("Result:", result);
  });
});
