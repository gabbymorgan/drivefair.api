const mongoose = require("mongoose");

const deliveryRouteSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DeliveryRoute", deliveryRouteSchema);