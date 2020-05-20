const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Message title is required"],
  },
  body: { type: String, required: [true, "Message body is required"] },
  sender: {
    type: ObjectId,
    refPath: "senderModel",
    required: [true, "Sender is required"],
  },
  senderModel: {
    type: String,
    required: [true, "Sender type is required"],
    enum: ["Vendor", "Customer", "Driver"],
  },
  recipient: {
    type: ObjectId,
    refPath: "recipientModel",
    required: [true, "Recipient is required"],
  },
  recipientModel: {
    type: String,
    required: [true, "Recipient type is required"],
    enum: ["Vendor", "Customer", "Driver"],
  },
  results: [Object],
  multicastId: String,
  successCount: Number,
});

module.exports = mongoose.model("Message", messageSchema);
