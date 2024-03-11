const soap = require("soap");
// // URL of the WSDL of the SOAP service
// process.env.HTTPS_PROXY = "http://127.0.0.1:8081";
// const url = "https://benzine.telcoinabox.com:443/tiab/UtbPooledResource?wsdl";
// const { HttpsProxyAgent } = require("https-proxy-agent");

// const agentOptions = {
//   rejectUnauthorized: false, // This disables SSL certificate validation
//   host: "127.0.0.1",
//   port: "8081",
// };

// const proxyAgent = new HttpsProxyAgent(agentOptions);
// const options = {
//   wsdl_options: {
//     agent: proxyAgent,
//   },
// };

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
soap.createClient(url, options, (err, client) => {
  // soap.createClient(url, (err, client) => {
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
