const stripe = require("stripe")(process.env.STRIPE_API_SECRET_KEY);

const createCharge = async (customer, order, vendor, paymentToken) => {
  return await stripe.charges.create({
    amount: Math.round((order.total + order.tip) * 100),
    currency: "usd",
    source: paymentToken,
    description: `${customer.firstName} ${customer.lastName} to ${vendor.businessName} - order #${order._id}`,
    statement_descriptor_suffix: vendor.businessName.replace(/[\\\<\>\'\"\*]/, "").slice(0, 22),
    receipt_email: customer.email,
  });
};

const refundCharge = async (chargeId) => {
  return await stripe.refunds.create({
    charge: chargeId,
  });
};

const createTestPaymentToken = async () => {
  return await stripe.tokens.create({
    card: {
      number: "4242424242424242",
      exp_month: 5,
      exp_year: 2022,
      cvc: "314",
    },
  });
};

module.exports = {
  createCharge,
  refundCharge,
  createTestPaymentToken,
};
