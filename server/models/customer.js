const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
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
  completedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

customerSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

customerSchema.methods.createCart = async function (orderItem, vendorId) {
  try {
    const newCart = new Order({
      customer: this._id,
      vendor: vendorId,
    });
    await newCart.addOrderItem(orderItem);
    this.cart = newCart;
    await this.save();
    return this.cart;
  } catch (error) {
    return { error, functionName: "createCart" };
  }
};

customerSchema.methods.getCart = async function () {
  try {
    const customerWithcart = await this.populate({
      path: "cart",
      populate: {
        path: "orderItems",
        populate: { path: "menuItem" },
      },
    }).execPopulate();
    return customerWithcart.cart;
  } catch (error) {
    return { error, functionName: "getCart" };
  }
};

customerSchema.methods.chargeCartToCard = async function (paymentToken) {
  try {
    const cart = await Order.findById(this.cart);
    const cartWithVendor = await cart.populate("vendor").execPopulate();
    const { vendor } = cartWithVendor;
    const charge = await createCharge(
      this,
      cartWithVendor,
      vendor,
      paymentToken
    );
    if (charge.error) {
      return { error: charge.error, functionName: "chargeToCard" };
    }
    const chargedCart = await cart.update({
      disposition: "PAID",
      chargeId: charge.id,
      amountPaid: charge.amount,
    });
    vendor.activeOrders.push(cart._id);
    this.activeOrders.push(cart._id);
    this.cart = null;
    await vendor.save();
    await this.save();
    await emailTransporter.sendMail({
      to: this.email,
      subject: `Your order for ${vendor.businessName}.`,
      html: OrderStatus.paidAndBeingMade(this.firstName, vendor.businessName),
    });
    await emailTransporter.sendMail({
      to: vendor.email,
      subject: `You have a new order for ${cart.method}!`,
      html: OrderStatus.paidAndBeingMade(this.firstName, vendor.businessName),
    });
    return chargedCart;
  } catch (error) {
    return { error, functionName: "chargeCartToCard" };
  }
};

module.exports = mongoose.model("Customer", customerSchema);
