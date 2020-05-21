const mongoose = require("mongoose");
const Order = require("./order");

const { ObjectId } = mongoose.Schema.Types;

const deliveryRouteSchema = new mongoose.Schema({
  vendor: { type: ObjectId, ref: "Vendor" },
  orders: [{ type: ObjectId, ref: "Order" }],
  driver: { type: ObjectId, ref: "Driver" },
  createdOn: { type: Date, default: Date.now },
});

deliveryRouteSchema.methods.acceptOrder = async function (orderId) {
  try {
    const order = await Order.findById(orderId);
    if (
      order.driver ||
      order.disposition !== "WAITING_FOR_DRIVER" ||
      order.method !== "DELIVERY"
    ) {
      return {
        error: { message: "Order not available." },
        functionName: "acceptOrder",
      };
    }
    this.vendor = order.vendor._id;
    order.disposition = "ACCEPTED_BY_DRIVER";
    order.driver = this.vendor;
    this.orders.pull(orderId);
    this.orders.push(orderId);
    await order.save();
    await this.save();
    await this.populate({
      path: "customer vendor address",
      select: "-password",
    }).execPopulate();
    return this;
  } catch (error) {
    return { error, functionName: "acceptOrder" };
  }
};

deliveryRouteSchema.methods.pickUpOrder = async function (orderId) {
  try {
    if (!this.orders.find((a) => a._id.toString() === orderId)) {
      return {
        error: { message: "Order does not belong to this driver." },
      };
    }
    const foundOrder = await Order.findById(orderId);
    if (foundOrder.disposition !== "READY") {
      return {
        error: "Order is not ready to pick up.",
        functionName: "pickUpOrder",
      };
    }
    foundOrder.disposition = "EN_ROUTE";
    await foundOrder.save();
    const savedRoute = await this.save();
    await savedRoute
      .populate({ path: "customer vendor address", select: "-password" })
      .execPopulate();
    return savedRoute;
  } catch (error) {
    return { error, functionName: "pickUpOrder" };
  }
};

deliveryRouteSchema.methods.deliverOrder = async function (orderId, driver) {
  try {
    if (!this.orders.find((a) => a._id.toString() === orderId)) {
      return {
        error: "Order does not belong to this driver.",
        functionName: "deliverOrder",
      };
    }
    const foundOrder = await Order.findById(orderId)
      .populate("customer")
      .populate("vendor");
    const { customer, vendor } = foundOrder;
    this.orders.pull(orderId);
    driver.orderHistory.push(orderId);
    customer.readyOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    vendor.readyOrders.pull(orderId);
    vendor.orderHistory.push(orderId);
    foundOrder.disposition = "DELIVERED";
    if (!this.orders.length) {
      driver.route = null;
    }
    await driver.save();
    await foundOrder.save();
    await customer.save();
    await vendor.save();
    const savedRoute = await this.save();
    await savedRoute
      .populate({ path: "customer vendor address", select: "-password" })
      .execPopulate();
    await customer.sendEmail({
      subject: "Your order has arrived!",
      text: "Go and get it!",
    });
    return savedRoute;
  } catch (error) {
    return { error, functionName: "deliverOrder" };
  }
};

module.exports = mongoose.model("DeliveryRoute", deliveryRouteSchema);
