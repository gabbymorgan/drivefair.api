const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const MenuItem = require("./menuItem");

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: ObjectId, ref: "MenuItem", required: true },
  price: { type: Number, required: true },
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
      "ACCEPTED_BY_DRIVER",
      "READY",
      "ASSIGNED",
      "EN_ROUTE",
      "DELIVERED",
      "CANCELED",
    ],
    default: "NEW",
  },
  chargeId: String,
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
  const updatedOrder = await this.save();
  return updatedOrder;
};

orderSchema.methods.removeOrderItem = async function (itemId) {
  const orderItem = await OrderItem.findById(itemId);
  await this.orderItems.pull(itemId);
  this.subtotal -= orderItem.price;
  await orderItem.remove();
  return await this.save();
};

orderSchema.methods.vendorAcceptOrder = async function ({
  vendor,
  selectedDriver,
  timeToReady,
}) {
  try {
    if (this.vendor.toString() !== vendor._id.toString()) {
      return { error: "Unauthorized", functionName: "vendorAcceptOrder" };
    }
    if (this.method === "DELIVERY") {
      const driverRequest = await selectedDriver.requestDriver(this._id);
      console.log({driverRequest})
      if (driverRequest.error) {
        return { error: driverRequest.error, functionName: "requestDriver" };
      }
    }
    this.estimatedReadyTime = new Date(Date.now() + timeToReady * 60 * 1000);
    this.disposition = "ACCEPTED_BY_VENDOR";
    await this.save();
    await this.populate({
      path: "activeOrders",
      populate: {
        path: "vendor customer address orderItems",
        select: "-password -email",
        populate: "menuItem",
      },
    }).execPopulate();
    return this;
  } catch (error) {
    return { error, functionName: "vendorAcceptOrder" };
  }
};


const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
