const stripe = require("stripe")(process.env.STRIPE_API_SECRET_KEY);
const logError = require("./errorLog");

const createCharge = (customer, order, paymentToken) => {
  const { vendor } = order;
  return stripe.charges.create(
    {
      amount: (order.total + order.tip) * 100,
      currency: "usd",
      source: paymentToken,
      description: `Payment by ${customer.firstName} ${customer.lastName} to ${vendor.businessName} - order #${order._id}`,
      statement_descriptor_suffix: vendor.businessName,
      receipt_email: customer.email,
    },
    function (error, charge) {
      if (error) {
        console.log(error);
        return { error };
      }
      return charge;
    }
  );
};

const refundCharge = (chargeId) => {
  return (
    stripe.refunds.create({
      charge: chargeId,
    }),
    function (error, charge) {
      if (error) {
        return { error };
      }
      return charge;
    }
  );
};

module.exports = {
  createCharge,
  refundCharge
};
