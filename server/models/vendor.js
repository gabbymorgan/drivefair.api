const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  createdOn: { type: Date, default: Date.now }
});

const vendorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 64
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128 },
  phoneNumber: { type: String },
  address: {
    city: String,
    state: String,
    street: String,
    unit: Number,
    zip: Number,
    latitude: Number,
    longitude: Number,
    note: String
  },
  businessName: { type: String, required: true, unique: true, maxlength: 128 },
  menu: [menuItemSchema],
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
});

vendorSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(this.password, password);
};

vendorSchema.methods.addMenuItem = async function({
  name,
  description,
  price
}) {
  const newMenuItem = new MenuItem({ name, description, price });
  this.menu.push(newMenuItem);
  await this.save();
};

vendorSchema.methods.removeMenuItem = async function(id) {
  this.menu.pull(id);
  await this.save();
};

const Vendor = mongoose.model("Vendor", vendorSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = Vendor;
