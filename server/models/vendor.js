const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true, maxlength: 64},
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128},
  businessName: { type: String, required: true, unique: true, maxlength: 128 },
  address: { type: String, required: true, unique: true },
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
});

module.exports = mongoose.model("Vendor", vendorSchema);