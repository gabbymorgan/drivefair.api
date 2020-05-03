const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
});

const modificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple", "single"],
    required: true,
  },
  name: { type: String, required: true },
  options: [optionSchema],
  defaultOptionIndex: { type: Number },
});

module.exports = mongoose.model("Modification", modificationSchema);;
