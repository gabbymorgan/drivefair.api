const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const Vendor = require("./vendor");
const { emailTransporter } = require("../services/communications");
const OrderStatus = require("../constants/static-pages/order-status");
const { createCharge } = require("../services/payment");

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 64,
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128 },
  firstName: { type: String, maxlength: 64 },
  lastName: { type: String, maxlength: 64 },
  phoneNumber: { type: String },
  address: {
    city: String,
    state: String,
    street: String,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String,
  },
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  cart: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

customerSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

customerSchema.methods.createCart = async function (orderItem, vendorId) {
  const newCart = new Order({
    customer: this._id,
    vendor: vendorId,
  });
  await newCart.addOrderItem(orderItem);
  this.cart = newCart;
  await this.save();
  return this.cart;
};

customerSchema.methods.getCart = async function () {
  return await Order.findById(this.cart).populate({
    path: "orderItems",
    populate: { path: "menuItem" },
  });
};

customerSchema.methods.chargeCartToCard = async function (paymentToken) {
  try {
    const cartWithVendor = await Order.findById(this.cart).populate("vendor");
    const vendor = await Vendor.findById(cartWithVendor.vendor._id);
    const charge = createCharge(this, cartWithVendor, paymentToken);
    if (charge.error) return charge;
    const chargedCart = await cartWithVendor.update({ disposition: "PAID" });
    vendor.activeOrders.push(cartWithVendor._id);
    this.activeOrders.push(cartWithVendor._id);
    this.cart = null;
    await vendor.save();
    await this.save();
    await emailTransporter.sendMail({
      to: this.email,
      subject: `Your order for ${vendor.businessName}.`,
      html: OrderStatus.paidAndBeingMade(this.firstName, vendor.businessName),
    });
    return chargedCart;
  } catch (error) {
    return { error };
  }
};

module.exports = mongoose.model("Customer", customerSchema);
