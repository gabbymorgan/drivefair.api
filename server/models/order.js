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
  amountPaid: Number,
  createdOn: { type: Date, default: Date.now },
  disposition: {
    type: String,
    enums: ["NEW", "PAID", "READY", "CANCELED", "DELIVERED"],
    default: "NEW",
  },
});

orderSchema.methods.addOrderItem = async function (item) {
  item.price = item.menuItem.price;
  item.modifications.forEach((modification) => {
    const { selectedOptions } = modification;
    if (Array.isArray(selectedOptions)) {
      modification.selectedOptions.forEach((option) => {
        item.price += Number(option.price);
      });
    } else {
      item.price += Number(selectedOptions.price);
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

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
