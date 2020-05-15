const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const DeliveryRoute = require("./deliveryRoute");
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
  route: { type: ObjectId, ref: "DeliveryRoute" },
  orderHistory: [{ type: ObjectId, ref: "Order" }],
  online: Boolean,
  latitude: Number,
  longitude: Number,
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "INACTIVE" },
});

driverSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

driverSchema.methods.getRoute = async function () {
  try {
    const route = await DeliveryRoute.findById(this.route);
    const populatedRoute = await route
      .populate({
        path: "orders",
        populate: {
          path: "address customer orderItems",
          populate: { path: "menuItem", populate: "modifications" },
        },
      })
      .populate("vendor")
      .execPopulate();
    return populatedRoute;
  } catch (error) {
    return { error, functionName: "getRoute" };
  }
};

driverSchema.methods.addOrderToRoute = async function (orderId) {
  try {
    const order = await Order.findById(orderId);
    const driverWithRoute = await this.populate({
      path: "route",
      populate: { path: "customer vendor", select: "-password" },
    }).execPopulate();
    let { route } = driverWithRoute;
    if (!route) {
      route = new DeliveryRoute({
        orders: [orderId],
        vendor: order.vendor,
        driver: this._id,
      });
      this.route = route._id;
    } else if (route.vendor._id.toString() !== order.vendor.toString()) {
      return {
        error: "Cannot add order from different vendor to route in progress.",
        functionName: "addOrderToRoute",
      };
    } else {
      route.orders.push(orderId);
    }
    order.driver = this._id;
    await route.save();
    await order.save();
    await this.save();
    return route;
  } catch (error) {
    return { error, functionName: "addOrderToRoute" };
  }
};

driverSchema.methods.toggleStatus = async function (status) {
  const route = await this.getRoute();
  if (route.orders && route.orders.length && status === "INACTIVE") {
    return {
      error: "There are still active orders on your route!",
      functionName: "toggleStatus",
    };
  }
  this.status = status;
  const savedDriver = await this.save();
  return savedDriver.status;
};

module.exports = mongoose.model("Driver", driverSchema);
