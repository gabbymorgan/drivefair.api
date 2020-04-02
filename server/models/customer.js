const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true, maxlength: 64},
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128},
  firstName: { type: String, required: true, maxlength: 64 },
  lastName: { type: String, required: true, maxlength: 64 },
  phoneNumber: { type: Number, maxlength: 10 },
  address: {
    city: String,
    state: String,
    street: String,
    number: Number,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String
  },
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

customerSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(this.password, password);
}

module.exports = mongoose.model("Customer", customerSchema);