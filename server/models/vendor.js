const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const modificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple", "single"],
    required: true,
  },
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  options: Object,
  defaultOption: String,
});

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  createdOn: { type: Date, default: Date.now },
  modifications: [modificationSchema],
});

const vendorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 64,
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
    note: String,
  },
  businessName: { type: String, required: true, unique: true, maxlength: 128 },
  menu: [menuItemSchema],
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

vendorSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

vendorSchema.methods.addMenuItem = async function ({
  name,
  description,
  price,
  modifications,
}) {
  const newMenuItem = await new MenuItem({
    name,
    description,
    price,
    modifications,
  }).save();
  this.menu.push(newMenuItem);
  await this.save();
};

vendorSchema.methods.removeMenuItem = async function (id) {
  this.menu.pull(id);
  await this.save();
};

vendorSchema.methods.editVendor = async function (changes) {
  const whiteList = ["email", "businessName", "password", "address", "phoneNumber"];
  whiteList.forEach(async (property) => {
    if (property === "password" && changes.newPassword) {
      console.log("this one", property)
      this[property] = await bcrypt.hash(changes.newPassword, 10);
    } else if (changes[property]) {
      console.log("that one", property)
      this[property] = changes[property];
    }
  });
  return await this.save();
};

const Vendor = mongoose.model("Vendor", vendorSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = Vendor;
