const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true, maxlength: 64},
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128},
  firstName: { type: String, required: true, maxlength: 64 },
  lastName: { type: String, required: true, maxlength: 64 },
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
});

module.exports = mongoose.model("Customer", customerSchema);