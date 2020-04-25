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
  imageUrl: {
    type: String,
    default: "HEhQ0C5",
    validator: function (imageUrl) {
      return /^\w+$/.test(imageUrl);
    },
    message: (props) => `${props.value} is not a valid imgur URI path!`,
  },
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
  logoUrl: {
    type: String,
    default: "HEhQ0C5",
    validator: function (imageUrl) {
      return /^\w+$/.test(imageUrl);
    },
    message: (props) => `${props.value} is not a valid imgur URI path!`,
  },
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
  return await this.save();
};

vendorSchema.methods.removeMenuItem = async function (menuItemId) {
  this.menu.pull(menuItemId);
  return await this.save();
};

vendorSchema.methods.editMenuItem = async function (menuItem, changes) {
  const whiteList = [
    "name",
    "description",
    "imageUrl",
    "price",
    "modifications",
  ];
  whiteList.forEach((property) => {
    console.log(changes[property]);
    if (changes[property]) {
      menuItem[property] = changes[property];
    }
  });
  return await this.save();
};

vendorSchema.methods.editVendor = async function (changes) {
  const whiteList = [
    "email",
    "businessName",
    "password",
    "address",
    "phoneNumber",
  ];
  whiteList.forEach(async (property) => {
    if (property !== "password" && changes[property]) {
      this[property] = changes[property];
    }
  });
  if (changes.newPassword) {
    this.password = await bcrypt.hash(changes.newPassword, 10);
  }
  return await this.save();
};

const Vendor = mongoose.model("Vendor", vendorSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = Vendor;
