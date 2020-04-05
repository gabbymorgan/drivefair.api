const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
  modifications: Object
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  items: [orderItemSchema],
  delivery: Boolean,
  address: {
    city: String,
    state: String,
    street: String,
    number: Number,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String
  },
  total: Number,
  amountPaid: Number,
  createdOn: { type: Date, default: Date.now }
});

orderSchema.methods.addItem = async function(item) {
  await this.items.push(new OrderItem(item));
};

orderSchema.methods.modifyItem = async function(itemId, key, value) {
  const foundItem = await this.items.find({ _id: itemId });
  foundItem[key] = value;
  await this.save();
};

orderSchema.methods.removeItem = async function(itemId) {
  await this.items.pull(itemId);
};

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;