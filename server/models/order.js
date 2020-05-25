const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const MenuItem = require("./menuItem");
const Driver = require("./driver");
const Authentication = require("../services/authentication");
const CustomerOrderStatus = require("../constants/static-pages/customer-order-status");

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: ObjectId,
    ref: "MenuItem",
    required: [true, "MenuItem ID is required."],
  },
  price: { type: Number, required: [true, "Order item price is required."] },
  modifications: Object,
});

const orderSchema = new mongoose.Schema({
  address: { type: ObjectId, ref: "Address" },
  customer: { type: ObjectId, ref: "Customer" },
  address: { type: ObjectId, ref: "Address" },
  vendor: { type: ObjectId, ref: "Vendor" },
  driver: { type: ObjectId, ref: "Driver" },
  orderItems: [{ type: ObjectId, ref: "OrderItem" }],
  method: { type: String, enums: ["DELIVERY", "PICKUP"], default: "PICKUP" },
  subtotal: { type: Number, default: 0 },
  tip: { type: Number, min: 0, default: 0 },
  total: { type: Number, default: 0 },
  estimatedReadyTime: { type: Date },
  actualReadyTime: { type: Date },
  estimatedDeliveryTime: { type: Date },
  actualDeliveryTime: { type: Date },
  amountPaid: Number,
  createdOn: { type: Date, default: Date.now },
  disposition: {
    type: String,
    enums: [
      "NEW",
      "PAID",
      "ACCEPTED_BY_VENDOR",
      "WAITING_FOR_DRIVER",
      "ACCEPTED_BY_DRIVER",
      "READY",
      "EN_ROUTE",
      "DELIVERED",
      "CANCELED",
    ],
    default: "NEW",
  },
  chargeId: String,
  requestedDrivers: [{ type: Object, ref: "Driver", default: [] }],
});

orderSchema.methods.addOrderItem = async function (menuItemId, modifications) {
  const orderItem = {};
  const menuItem = await MenuItem.findById(menuItemId);
  const newOrderItem = await new OrderItem({
    price: menuItem.price,
    menuItem,
    modifications,
  });

  newOrderItem.modifications.forEach((modification) => {
    const { options } = modification;
    if (Array.isArray(options)) {
      modification.options.forEach((option) => {
        orderItem.price += Number(option.price);
      });
    } else {
      orderItem.price += Number(options.price);
    }
  });
  await newOrderItem.save();
  this.orderItems.push(newOrderItem._id);
  this.subtotal += newOrderItem.price;
  await this.save();
  return await this.populate({
    path: "orderItems",
    populate: { path: "menuItem" },
  }).execPopulate();
};

orderSchema.methods.removeOrderItem = async function (itemId) {
  const orderItem = await OrderItem.findById(itemId);
  await this.orderItems.pull(itemId);
  this.subtotal -= orderItem.price;
  await orderItem.remove();
  await this.save();
  return await this.populate({
    path: "orderItems",
    populate: { path: "menuItem" },
  }).execPopulate();
};

orderSchema.methods.vendorAcceptOrder = async function ({
  vendor,
  timeToReady,
}) {
  try {
    if (this.vendor.toString() !== vendor._id.toString()) {
      return {
        error: { message: "Unauthorized" },
        functionName: "vendorAcceptOrder",
      };
    }
    this.disposition = "ACCEPTED_BY_VENDOR";
    this.estimatedReadyTime = new Date(Date.now() + timeToReady * 60 * 1000);
    await this.save();
    await vendor
      .populate({
        path: "activeOrders",
        populate: {
          path: "vendor customer address orderItems",
          select: "-password -email",
          populate: "menuItem",
        },
      })
      .execPopulate();
    return this;
  } catch (error) {
    return { error, functionName: "vendorAcceptOrder" };
  }
};

orderSchema.methods.requestDrivers = async function (driverIds) {
  try {
    const timers = {};
    if (!driverIds.length) {
      return;
    }
    const requests = driverIds.map(async (driverId) => {
      const driver = await Driver.findById(driverId);
      const requestDriverResponse = await driver.requestDriver(this);
      if (requestDriverResponse.error) {
        return { error: requestDriverResponse.error, success: false, driverId };
      }
      this.requestedDrivers.push(driverId);
      this.disposition = "WAITING_FOR_DRIVER";
      await this.save();
      timers[driverId] = setTimeout(async () => {
        const updatedOrder = await Order.findById(this._id);
        updatedOrder.requestedDrivers.pull(driverId);
        if (!updatedOrder.requestedDrivers.length && !updatedOrder.driver) {
          updatedOrder.disposition = "ACCEPTED_BY_VENDOR";
        }
        await updatedOrder.save();
      }, 60000);
      return {
        driverId,
        success: true,
      };
    });
    return await Promise.all(requests);
  } catch (error) {
    return error;
  }
};

orderSchema.methods.driverRejectOrder = async function (driverId) {
  try {
    //reject the order
    return { success: true };
  } catch (error) {
    return { error: { ...error, functionName: "driverRejectOrder" } };
  }
};

orderSchema.methods.driverAcceptOrder = async function (driverId) {
  try {
    const driver = await Driver.findById(driverId);
    if (
      this.driver ||
      this.disposition !== "WAITING_FOR_DRIVER" ||
      this.method !== "DELIVERY"
    ) {
      return {
        error: { message: "Order not available." },
        functionName: "driverAcceptOrder",
      };
    }
    this.disposition = "ACCEPTED_BY_DRIVER";
    this.driver = driverId;
    driver.orders.push(this._id);
    await this.save();
    await driver.save();
    await driver
      .populate({
        path: "orders",
        populate: {
          path: "customer vendor address orderItems",
          populate: "menuItem modifications",
        },
      })
      .execPopulate();
    return driver;
  } catch (error) {
    return { error, functionName: "driverAcceptOrder" };
  }
};

orderSchema.methods.driverPickUpOrder = async function (driverId) {
  try {
    const driver = await Driver.findById(driverId);
    if (this.driver.toString() !== driverId.toString()) {
      return {
        error: { message: "Order does not belong to this driver." },
      };
    }
    if (this.disposition !== "READY") {
      return {
        error: "Order is not ready to pick up.",
        functionName: "driverPickUpOrder",
      };
    }
    this.disposition = "EN_ROUTE";
    await this.save();
    await driver.save();
    await driver
      .populate({
        path: "orders",
        populate: {
          path: "customer vendor address orderItems",
          populate: "menuItem modifications",
        },
      })
      .execPopulate();
    return driver;
  } catch (error) {
    return { error, functionName: "driverPickUpOrder" };
  }
};

orderSchema.methods.driverDeliverOrder = async function (driverId) {
  try {
    const orderId = this._id;
    const driver = await Driver.findById(driverId);
    if (this.driver.toString() !== driverId.toString()) {
      return {
        error: "Order does not belong to this driver.",
        functionName: "driverDeliverOrder",
      };
    }
    await this.populate("customer vendor").execPopulate();
    const { customer, vendor } = this;
    driver.orders.pull(orderId);
    driver.orderHistory.push(orderId);
    customer.readyOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    vendor.readyOrders.pull(orderId);
    vendor.orderHistory.push(orderId);
    this.disposition = "DELIVERED";
    this.actualDeliveryTime = new Date();
    await this.save();
    await driver.save();
    await customer.save();
    await vendor.save();
    await customer.sendEmail({
      setting: "ORDER_DELIVERED",
      subject: "Your order has arrived!",
      html: CustomerOrderStatus.delivered(
        customer.firstName,
        vendor.businessName,
        await Authentication.signEmailToken(customer, "Customer")
      ),
    });
    await driver
      .populate({
        path: "orders",
        populate: {
          path: "customer vendor address",
          select: "-password",
        },
      })
      .execPopulate();
    return driver;
  } catch (error) {
    return { error, functionName: "driverDeliverOrder" };
  }
};

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
