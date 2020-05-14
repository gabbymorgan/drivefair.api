const mongoose = require("mongoose");
const Order = require("./order");

const { ObjectId } = mongoose.Schema.Types;

const deliveryRouteSchema = new mongoose.Schema({
  vendor: { type: ObjectId, ref: "Vendor" },
  orders: [{ type: ObjectId, ref: "Order" }],
  driver: { type: ObjectId, ref: "Driver" },
  createdOn: { type: Date, default: Date.now },
});

deliveryRouteSchema.methods.rejectOrder = async function (orderId) {
  try {
    if (!this.orders.find((a) => a._id.toString() === orderId)) {
      return { error: "Order does not belong to this driver." };
    }
    this.orders.pull({ _id: orderId });
    const foundOrder = await Order.findById(orderId);
    foundOrder.disposition = "PAID";
    foundOrder.driver = null;
    await foundOrder.save();
    const savedRoute = await this.save();
    await savedRoute
      .populate({ path: "customer vendor address", select: "-password" })
      .execPopulate();
    return savedRoute;
  } catch (error) {
    return { error, functionName: "rejectOrder" };
  }
};

deliveryRouteSchema.methods.pickUpOrder = async function (orderId) {
  try {
    if (!this.orders.find((a) => a._id.toString() === orderId)) {
      return { error: "Order does not belong to this driver." };
    }
    const foundOrder = await Order.findById(orderId);
    foundOrder.disposition = "EN_ROUTE";
    await foundOrder.save();
    const route = await this.populate({
      path: "customer vendor address",
      select: "-password",
    }).execPopulate();
    return route;
  } catch (error) {
    return { error, functionName: "pickUpOrder" };
  }
};

deliveryRouteSchema.methods.deliverOrder = async function (orderId) {
  try {
    if (!this.orders.find((a) => a._id.toString() === orderId)) {
      return { error: "Order does not belong to this driver." };
    }
    const foundOrder = await Order.findById(orderId).populate(
      "customer vendor driver"
    );
    const { customer, vendor, driver } = foundOrder;
    this.orders.pull(orderId);
    driver.orderHistory.push(orderId);
    customer.readyOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    vendor.readyOrders.pull(orderId);
    vendor.orderHistory.push(orderId);
    foundOrder.disposition = "DELIVERED";
    await foundOrder.save();
    await customer.save();
    await vendor.save();
    const savedRoute = await this.save();
    await savedRoute
      .populate({ path: "customer vendor address", select: "-password" })
      .execPopulate();
    return savedRoute;
  } catch (error) {
    return { error, functionName: "deliverOrder" };
  }
};

module.exports = mongoose.model("DeliveryRoute", deliveryRouteSchema);
