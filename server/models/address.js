const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  city: { type: String, required: true },
  state: { type: String, required: true },
  street: { type: String, required: true },
  unit: Number,
  zip: { type: Number, required: true },
  latitude: Number,
  longitude: Number,
  note: { type: String },
  createdOn: { type: Date, default: Date.now },
  modifiedOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Address", addressSchema);
