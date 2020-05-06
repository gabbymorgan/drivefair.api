const stripe = require("stripe")(process.env.STRIPE_API_SECRET_KEY);

const createCharge = async (customer, order, vendor, paymentToken) => {
  return await stripe.charges.create({
    amount: Math.round((order.total + order.tip) * 100),
    currency: "usd",
    source: paymentToken,
    description: `Payment by ${customer.firstName} ${customer.lastName} to ${vendor.businessName} - order #${order._id}`,
    statement_descriptor_suffix: vendor.businessName,
    receipt_email: customer.email,
  });
};

const refundCharge = async (chargeId) => {
  return await stripe.refunds.create({
    charge: chargeId,
  });
};

module.exports = {
  createCharge,
  refundCharge,
};
