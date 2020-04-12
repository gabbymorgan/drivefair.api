const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  body: Object,
  hostname: String,
  user: Object,
  error: Object,
  functionName: String,
  path: String,
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ErrorLog", errorLogSchema);