const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  request: Object,
  error: Object,
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ErrorLog", errorLogSchema);