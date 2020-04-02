const mongoose = require("mongoose");

const orderShcema = new mongoose.Schema({
  customer: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
  vendor: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }],
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderShcema);