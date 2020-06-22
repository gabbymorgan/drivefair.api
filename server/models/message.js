const mongoose = require("mongoose");
const Communications = require("../services/communications");
const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Message title is required"],
  },
  body: { type: String, required: [true, "Message body is required"] },
  data: Object,
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
  deviceTokens: [String],
  results: [Object],
  multicastId: String,
  successCount: Number,
  messageType: {
    type: String,
    enums: ["CHAT", "DRIVER_REQUEST", "ORDER_READY", "ORDER_CANCELED"],
    required: true,
  },
});

messageSchema.pre("save", async function () {
  try {
    const { deviceTokens, title, body, data } = this;
    const {
      successCount,
      results,
      multicastId,
    } = await Communications.sendPushNotification({
      deviceTokens,
      title,
      body,
      data,
    });
    this.successCount = successCount;
    this.results = results;
    this.multicastId = multicastId;
    return await this.save();
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "onMessageSave" } };
  }
});

module.exports = mongoose.model("Message", messageSchema);
