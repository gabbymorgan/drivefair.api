const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const deliveryRouteSchema = new mongoose.Schema({
  vendor: { type: ObjectId, ref: "Vendor" },
  orders: [{ type: ObjectId, ref: "Order" }],
  createdOn: { type: Date, default: Date.now },
});



module.exports = mongoose.model("DeliveryRoute", deliveryRouteSchema);
