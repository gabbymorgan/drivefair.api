const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const Address = require("./address");
const { emailTransporter } = require("../services/communications");
const OrderStatus = require("../constants/static-pages/order-status");
const { createCharge } = require("../services/payment");
const { ObjectId } = mongoose.Schema.Types;

const driverSchema = new mongoose.Schema({
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
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  route: [{ type: ObjectId, ref: "Order" }],
  orderHistory: [{ type: ObjectId, ref: "Order" }],
  online: Boolean,
  latitude: Number,
  longitude: Number,
});

driverSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

driverSchema.methods.getRoute = async function () {
  try {
    const driverWithRoute = await this.populate({
      path: "route",
      populate: {
        path: "orders",
        populate: { path: "customer vendor address", select: "-password" },
      },
    }).execPopulate();
    return driverWithRoute.route;
  } catch (error) {
    return { error, functionName: "getCart" };
  }
};

module.exports = mongoose.model("Driver", driverSchema);
