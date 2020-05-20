const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Option name is required"] },
  price: {
    type: Number,
    required: [true, "Option price is required"],
    default: 0,
  },
});

const modificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple", "single"],
    required: [true, "Selection type (multiple, single) is required"],
  },
  name: { type: String, required: [true, "Modification name is required"] },
  options: [optionSchema],
  defaultOptionIndex: { type: Number },
});

module.exports = mongoose.model("Modification", modificationSchema);
