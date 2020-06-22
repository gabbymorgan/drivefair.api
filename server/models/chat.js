const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const participantSchema = new mongoose.Schema({
  id: {
    type: ObjectId,
    refPath: "model",
    required: [true, "Sender is required"],
  },
  model: {
    type: String,
    required: [true, "Sender type is required"],
    enum: ["Vendor", "Customer", "Driver"],
  },
});

const chatSchema = new mongoose.Schema({
  participants: [participantSchema],
  messages: [{ type: ObjectId, ref: "Message" }],
});

module.exports = mongoose.model("Chat", chatSchema);
