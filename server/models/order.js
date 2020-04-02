const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  description: {type: String},
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);