const mongoose = require("mongoose");

const activityLog = new mongoose.Schema({
  body: Object,
  hostname: String,
  userId: String,
  userType: String,
  path: String,
  method: String,
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActivityLog", activityLog);