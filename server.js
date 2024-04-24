// SOAP Body

// Create a SOAP client with proxy configuration
// soap.createClient(url, options, (err, client) => {
//   soap.createClient(url, (err, client) => {
//   if (err) {
//     console.error("Error creating SOAP client:", err);
//     return;
//   }

//   client.reserveResources(args, (err, result) => {
//     if (err) {
//       console.error("Error calling SOAP method:", err);
//       return;
//     }

//     console.log("Result:", result);
//   });
// });
const args = {
  login: {
    userName: "justmobile.api.2",
    password: "BXKhod9473d@",
  },
  createRequest: {
    custNo: "502234",
    orderType: "SRVC_ORD",
    orderAction: "ADD_WME_NEW",
    orderItems: {
      wmeNewReqItem: {
        lineType: "R",
        lineName: "Test Activation",
        planNo: "11143933",
        orderNotes: "Test Order Notes",
        serviceNotes: "Test Service Notes",
        orderItemAddress: {
          locality: "SYDNEY",
          postcode: "2000",
          streetName: "22 Lalwinya",
          additionalAddress: "22 Lalwinya",
        },
        msn: "0490843968",
        isEsim: true,
        isQRcode: true,
        cycleNo: "28",
        spendCode: "80610",
        notificationEmail: "adabeer445@gmail.com",
      },
    },
  },
};
// const fetch = require('node-fetch');

const url = "http://54.211.148.120:2000/service";
// const auth = 'Basic ' + Buffer.from('username:password').toString('base64');

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // 'Authorization': auth
  },
  body: JSON.stringify({
    url: "https://api-octane.telcoinabox.com.au/tiabwsv2/UtbOrder?wsdl",
    args: args,
    methodName: "orderCreate",
  }),
};

fetch(url, options)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    if (data.return.errorCode != 0) {
      console.error("error", data);
    } else {
      console.log("success", data);
    }
  })
  .catch((error) => {
    console.error("error", error);
  });
