const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const { createCharge } = require("../services/payment");

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 64
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128 },
  fullName: { type: String, maxlength: 128 },
  phoneNumber: { type: String },
  address: {
    city: String,
    state: String,
    street: String,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String
  },
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  cart: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
});

customerSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(this.password, password);
};

customerSchema.methods.createCart = async function(orderItem, vendorId) {
  const newCart = new Order({
    customer: this._id,
    vendor: vendorId
  });
  await newCart.addOrderItem(orderItem);
  this.cart = newCart;
  await this.save();
  return this.cart;
};

customerSchema.methods.getCart = async function() {
  return await Order.findById(this.cart).populate({
    path: "orderItems",
    populate: { path: "menuItem" }
  });
};

customerSchema.methods.chargeCartToCard = async function(paymentToken) {
  try {
    const cart = await Order.findById(this.cart).populate("vendor");
    const charge = createCharge(this, cart, paymentToken);
    if (charge.error) return charge;
    const chargedCart = await cart.update({ disposition: "PAID" });
    await this.update({
      cart: null,
      $addToSet: { activeOrders: chargedCart._id }
    });
    return chargedCart;
  } catch (error) {
    console.log(error);
    return { error };
  }
};

module.exports = mongoose.model("Customer", customerSchema);
