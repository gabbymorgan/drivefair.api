const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
});

const modificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple", "single"],
    required: true,
  },
  name: { type: String, required: true },
  options: [optionSchema],
  defaultOption: { type: String },
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
  modifiedOn: { type: Date, default: Date.now },
  modifications: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Modification" },
  ],
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
  menu: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
  modifications: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Modification" },
  ],
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

vendorSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

vendorSchema.methods.editVendor = async function (changes) {
  const whiteList = [
    "email",
    "businessName",
    "password",
    "address",
    "logoUrl",
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

vendorSchema.methods.getMenu = async function () {
  const { menu, modifications } = await this.populate({
    path: "menu",
    populate: "modifications",
  })
    .populate("modifications")
    .execPopulate();
  return { menuItems: menu, modifications };
};

vendorSchema.methods.addMenuItem = async function (properties) {
  const savedMenuItem = await new MenuItem(properties).save();
  this.menu.push(savedMenuItem._id);
  const savedVendor = await this.save();
  await savedVendor
    .populate({ path: "menu", populate: "modifications" })
    .execPopulate();
  return savedVendor.menu;
};

vendorSchema.methods.removeMenuItem = async function (menuItemId) {
  this.menu.pull(menuItemId);
  const savedVendor = await this.save();
  await savedVendor.populate({path: "menu", populate: "modifications"}).execPopulate();
  return savedVendor.menu;
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
  menuItem.modifiedOn = Date.now();
  await menuItem.save();
  const savedVendor = await this.save();
  await savedVendor.populate("menu").execPopulate();
  return savedVendor.menu;
};

vendorSchema.methods.addModification = async function (modification) {
  try {
    const optionsWithoutBlanks = modification.options.filter(
      (option) => option.name
    );
    modification.options = optionsWithoutBlanks;
    console.log(modification);
    const newModification = await new Modification(modification).save();
    this.modifications.push(newModification._id);
    await this.save();
    const vendorWithModifications = await this.populate(
      "modifications"
    ).execPopulate();
    return vendorWithModifications.modifications;
  } catch (error) {
    console.log(error);
    logError(error, {}, "addModification");
    return error;
  }
};

vendorSchema.methods.removeModification = async function (modification) {
  const vendorWithMenu = await Vendor.findById(this._id).populate("menu");
  const updatedMenu = vendorWithMenu.map(async (menuItem) => {
    menuItem.modifications.pull(modificationId);
    await menuItem.save();
  });
  await Promise.all(updatedMenu);
  this.modifications.pull(modificationId);
  await this.save();
  const vendorWithModifications = await this.populate(
    "modifications"
  ).execPopulate();
  return vendorWithModifications.modifications;
};

vendorSchema.methods.editModification = async function (
  modification,
  name,
  value
) {
  modification[name] = value;
  await modification.save();
  const vendorWithModifications = await this.populate(
    "modifications"
  ).execPopulate();
  return vendorWithModifications.modifications;
};

const Vendor = mongoose.model("Vendor", vendorSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);
const Modification = mongoose.model("Modification", modificationSchema);

module.exports = Vendor;
