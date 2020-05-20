const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const DeliveryRoute = require("./deliveryRoute");
const Message = require("./message");
const Communications = require("../services/communications");
const { getAddressString } = require("../services/location");
const { ObjectId } = mongoose.Schema.Types;

const driverSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
    index: true,
    maxlength: 64,
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: {
    type: String,
    required: [true, "password is required."],
    maxlength: 128,
  },
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
  deviceTokens: [String],
  emailSettings: { type: Object, default: {} },
  notificationSettings: { type: Object, default: { REQUEST_DRIVER: true } },
});

driverSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

driverSchema.methods.sendEmail = async function ({
  setting,
  subject,
  text,
  html,
}) {
  if (!setting || this.emailSettings[setting]) {
    return await Communications.sendMail({
      to: this.email,
      subject,
      text,
      html,
    });
  } else
    return {
      error: {
        message: `Driver has turned off email setting: ${setting}`,
        status: 401,
      },
    };
};

driverSchema.methods.sendPushNotification = async function ({
  setting,
  title,
  body,
  data,
  senderId,
  senderModel,
}) {
  if (!setting || this.notificationSettings[setting]) {
    const message = new Message({
      recipient: this._id,
      recipientModel: "Driver",
      sender: senderId,
      senderModel,
      title,
      body,
      data,
      deviceTokens: this.deviceTokens,
    });
    return await message.save();
  }
  return {
    error: {
      message: `Driver has turned off notification setting: ${setting}`,
      status: 401,
    },
  };
};

driverSchema.methods.getRoute = async function () {
  try {
    let route = await DeliveryRoute.findById(this.route);
    if (!route) {
      route = await new DeliveryRoute({ driver: this._id }).save();
      this.route = route._id;
      await this.save();
    }
    await route
      .populate({
        path: "orders",
        populate: {
          path: "address customer vendor orderItems",
          populate: { path: "menuItem", populate: "modifications" },
        },
      })
      .populate("vendor")
      .execPopulate();
    return route;
  } catch (error) {
    return { error, functionName: "getRoute" };
  }
};

driverSchema.methods.toggleStatus = async function (status) {
  if (
    this.route &&
    (await this.getRoute().orders.length) &&
    status === "INACTIVE"
  ) {
    return {
      error: "There are still active orders on your route!",
      functionName: "toggleStatus",
    };
  }
  this.status = status;
  const savedDriver = await this.save();
  return savedDriver.status;
};

driverSchema.methods.addDeviceToken = async function (deviceToken) {
  this.deviceTokens.pull(deviceToken);
  this.deviceTokens.push(deviceToken);
  await this.save();
  return this;
};

driverSchema.methods.requestDriver = async function (orderId) {
  const order = await Order.findById(orderId);
  await order.populate("vendor customer address").execPopulate();
  const { vendor, customer } = order;
  if (order.driver) {
    return { error: { message: "Order already has driver assigned." } };
  }
  try {
    const title = "Incoming Order!";
    const body = "Will you accept?";
    const data = {
      orderId: orderId.toString(),
      messageType: "REQUEST_DRIVER",
      openModal: "true",
      businessName: vendor.businessName,
      customerName: `${customer.firstName} ${customer.lastName[0]}`,
      businessAddress: getAddressString(vendor.address),
      customerAddress: getAddressString(order.address),
      tip: order.tip.toString(),
    };
    return await this.sendPushNotification({
      setting: "REQUEST_DRIVER",
      title,
      body,
      data,
      senderId: vendor._id,
      senderModel: "Vendor",
    });
  } catch (error) {
    return { error };
  }
};

module.exports = mongoose.model("Driver", driverSchema);
