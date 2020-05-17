const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: { type: String, required: true },
  sender: { type: ObjectId, refPath: "senderModel", required: true },
  senderModel: {
    type: String,
    required: true,
    enum: ["Vendor", "Customer", "Driver"],
  },
  recipient: { type: ObjectId, refPath: "recipientModel", required: true },
  recipientModel: {
    type: String,
    required: true,
    enum: ["Vendor", "Customer", "Driver"],
  },
  results: [Object],
  multicastId: String,
  successCount: Number,
});

module.exports = mongoose.model("Message", messageSchema);
