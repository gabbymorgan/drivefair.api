const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
  price: Number,
  modifications: Object,
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  orderItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "OrderItem" }],
  method: { type: String, enums: ["DELIVERY", "PICKUP"], default: "PICKUP" },
  address: {
    city: String,
    state: String,
    street: String,
    number: Number,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String,
  },
  total: { type: Number, default: 0 },
  tip: { type: Number, min: 0 },
  amountPaid: Number,
  createdOn: { type: Date, default: Date.now },
  disposition: {
    type: String,
    enums: ["NEW", "PAID", "COMPLETE", "CANCELED", "DELIVERED"],
    default: "NEW",
  },
  chargeId: String,
});

orderSchema.methods.addOrderItem = async function (item) {
  item.price = item.menuItem.price;
  item.modifications.forEach((modification) => {
    const { options } = modification;
    if (Array.isArray(options)) {
      modification.options.forEach((option) => {
        item.price += Number(option.price);
      });
    } else {
      item.price += Number(options.price);
    }
  });
  const newOrderItem = await new OrderItem({ ...item }).save();
  this.orderItems.push(newOrderItem);
  this.total += item.price;
  return await this.save();
};

orderSchema.methods.removeOrderItem = async function (itemId) {
  const orderItem = await OrderItem.findById(itemId);
  await this.orderItems.pull(itemId);
  this.total -= orderItem.price;
  await orderItem.remove();
  return await this.save();
};

orderSchema.methods.changeDisposition = async function (disposition) {
  try {
    this.disposition = disposition;
    return await this.save();
  } catch (error) {
    return { error, functionName: "changeDisposition" };
  }
};


const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
