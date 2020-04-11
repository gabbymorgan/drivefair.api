const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");

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
  fullName: { type: String, maxlength: 64 },
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

module.exports = mongoose.model("Customer", customerSchema);
