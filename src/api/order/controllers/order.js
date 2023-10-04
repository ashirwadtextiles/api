("use strict");
// const Razorpay = require("razorpay");
const axios = require('axios');
const crypto = require('crypto');
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
// Your salt key and salt index
// const saltKey = '7dc8434b-40a3-4ee8-b10f-0b298c03f580';
const saltKey = '7dc8434b-40a3-4ee8-b10f-0b298c03f580'; // Replace with your actual salt key -> uat

const saltIndex = '1';
const merchantId = "ATTIREONLINE";
module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {

    const { products, payload, paymentSuccess, formData, transactionID } = ctx.request.body;

    try {
      if (paymentSuccess) {
        const concatenatedString = '/pg/v1/status/' + merchantId + '/' + transactionID + saltKey;
        const hash = crypto.createHash('sha256').update(concatenatedString).digest('hex');
        const checkHash = hash + '###' + saltIndex;

        // const url = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
        const url = `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${transactionID}`;
        const headers = {
          'Content-Type': 'application/json',
          'X-VERIFY': checkHash,
          'X-MERCHANT-ID': merchantId,
        };
        let validPayment = null;
        await axios.get(url, { headers })
          .then(async (response) => {
            if (response.data.success === true) {
              validPayment = response.data;
              // Update the records that match the criteria
              const updatedOrder = await strapi
                .service("api::order.order")
                .create({
                  data: {
                    products: cartItems,
                    razorpayOrderId: "Success",
                    formData: {
                      "Transaction": "Successful",
                      "TransactionID": transactionID,
                      formData
                    }
                  }
                });
              if (!updatedOrder) {
                throw new Error("Failed to update order after payment.");
              }
              console.log("Successfully updated order.");
            } else {
              throw new Error("Payment Status Failed on phonepe server!");
            }
          })
          .catch((error) => {
            console.error("Payment Status Error: ", error);
            ctx.response.status = 500;
            return { error: error.message };
          });

        if (validPayment) {
          ctx.response.status = 200;
          return { data: validPayment};
        } else {
          ctx.response.status = 300;
          return { data: "Payment Check Invalid!" };
        }
      }
      console.log(payload);
      // Convert the payload to a string
      const payloadStr = JSON.stringify(payload);

      // Encode the string as a Base64 encoded payload
      const base64Payload = Buffer.from(payloadStr).toString('base64');

      const concatenatedString = base64Payload + '/pg/v1/pay' + saltKey;
      const hash = crypto.createHash('sha256').update(concatenatedString).digest('hex');

      const finalHash = hash + '###' + saltIndex;
      const requestData = {
        request: base64Payload
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-VERIFY': finalHash,
        'accept': 'application/json',
      };

      // Define the URL
     const url = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
    //  const url = 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

      // Make the POST request using Axios
      let redirectURL = null;
      await axios.post(url, requestData, { headers })
        .then(response => {
          redirectURL = response.data;
          console.log(response.data);

        })
        .catch(error => {
          console.error("Error making payment request", error);
          ctx.response.status = 500;
          return { error: error.message };
        });

      // if (okPayment) {
      //   const createdOrder = await strapi
      //     .service("api::order.order")
      //     .create({ data: { products, razorpayOrderId: razorpayOrderId, formData } });
      //   if (!createdOrder) {
      //     throw new Error("Failed to create order.");
      //   }
      //   console.log({ createdOrder });
      //   return;
      // }
      // console.log({ formData });
      // const lineItems = await Promise.all(
      //   products.map(async (product) => {
      //     const imgUrl = "http://api.rebirthclothing.in" + (product.attributes.img.data[0].attributes.url);
      //     console.log(imgUrl);
      //     const item = await strapi
      //       .service("api::product.product")
      //       .findOne(product.id);
      //     const filteredArray = Array(product).map(item => {
      //       const sizes = Object.keys(item.attributes)
      //         .filter(key => key.startsWith('SIZE_'))
      //         .reduce((obj, key) => {
      //           obj[key.slice(0, 4) + '-' + key.slice(5, 7)] = item.attributes[key];
      //           return obj;
      //         }, {});

      //       return { sizes };
      //     });
      //     const result = filteredArray.map(item => {
      //       const sizes = Object.entries(item.sizes)
      //         .map(([key, value]) => `${key}: ${value} pc(s)`)
      //         .join(', ');

      //       return sizes;
      //     });
      //     const string = result.join(', ');
      //     return {
      //       price_data: {
      //         currency: "inr",
      //         product_data: {
      //           name: item.title,
      //           "description": string,
      //           "images": [`${imgUrl}`],
      //         },
      //         unit_amount: Math.round(item.price * 100),
      //       },
      //       quantity: product.attributes.quantity,
      //     };
      //   })
      // );
      // const razorpay = new Razorpay({
      //   key_id: "rzp_test_8pvp8ESL0GD1VS", // Replace with your Razorpay key ID
      //   key_secret: "QQVxcAQentO8IuJyRMY3iuao", // Replace with your Razorpay key secret
      // });
      // const totalUnitAmount = lineItems.map(item => item.price_data.unit_amount)
      //   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      // const options = {
      //   amount: totalUnitAmount,
      //   currency: "INR",
      //   receipt: "order_receipt",
      // };
      // const order = await razorpay.orders.create(options);

      // const createdOrder = await strapi.query("orders").create(newOrder);

      // return { redirectURL: "https" };
      const createdOrder = await strapi
        .service("api::order.order")
        .create({ data: { products, razorpayOrderId: "False", formData } });
      if (!createdOrder) {
        throw new Error("Failed to create order.");
      }
      console.log({ createdOrder });
      if (redirectURL === null) {
        return { data: null };
      } else {
        console.log("returning the data of redirect url");
        return { data: redirectURL };
      }
    } catch (error) {
      console.error("Error creating order:", error);
      ctx.response.status = 500;
      return { error: error.message };
    }

  },
}));