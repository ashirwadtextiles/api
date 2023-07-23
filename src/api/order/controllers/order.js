("use strict");
const Razorpay = require("razorpay");
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products,formData } = ctx.request.body;
    try {
      console.log({formData});
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const imgUrl = "http://api.rebirthclothing.in" + (product.attributes.img.data[0].attributes.url);
          console.log(imgUrl);
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);
          const filteredArray = Array(product).map(item => {
            const sizes = Object.keys(item.attributes)
              .filter(key => key.startsWith('SIZE_'))
              .reduce((obj, key) => {
                obj[key.slice(0, 4) + '-' + key.slice(5, 7)] = item.attributes[key];
                return obj;
              }, {});

            return { sizes };
          }); 
          const result = filteredArray.map(item => {
            const sizes = Object.entries(item.sizes)
              .map(([key, value]) => `${key}: ${value} pc(s)`)
              .join(', ');

            return sizes;
          });
          const string = result.join(', ');
          return {
            price_data: {
              currency: "inr",
              product_data: {
                name: item.title,
                "description": string,
                "images": [`${imgUrl}`],
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.attributes.quantity,
          };
        })
      );                                                        
      const razorpay = new Razorpay({
        key_id: "rzp_test_8pvp8ESL0GD1VS", // Replace with your Razorpay key ID
        key_secret: "QQVxcAQentO8IuJyRMY3iuao", // Replace with your Razorpay key secret
      });
      const totalUnitAmount = lineItems.map(item => item.price_data.unit_amount)
      .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      const options = {
        amount:totalUnitAmount,
        currency: "INR",
        receipt: "order_receipt",
      };
      const order = await razorpay.orders.create(options);

      // const createdOrder = await strapi.query("orders").create(newOrder);
      const createdOrder =  await strapi
        .service("api::order.order")
        .create({ data: { products, razorpayOrderId: order.id,formData } });

      if (!createdOrder) {
        throw new Error("Failed to create order.");
      }
      console.log({createdOrder});
      return { razorpayOrderId: order.id,lineItems };
    } catch (error) {
      console.error("Error creating order:", error);
      ctx.response.status = 500;
      return { error: error.message };
    }

  },
}));