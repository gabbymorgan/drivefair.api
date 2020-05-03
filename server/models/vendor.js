const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const Customer = require("./customer");
const Modification = require("./modification");
const MenuItem = require("./menuItem");
const Payment = require("../services/payment");

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
    default: "e7NBE6u",
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
  completedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
});

vendorSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

vendorSchema.methods.editVendor = async function (changes) {
  try {
    const whiteList = [
      "email",
      "businessName",
      "password",
      "address",
      "logoUrl",
      "phoneNumber",
    ];
    whiteList.forEach(async (property) => {
      if (property !== "password" && changes[property] !== undefined) {
        this[property] = changes[property];
      }
    });
    if (changes.newPassword) {
      this.password = await bcrypt.hash(changes.newPassword, 10);
    }
    return await this.save();
  } catch (error) {
    return { error, functionName: "editVendor" };
  }
};

vendorSchema.methods.getMenu = async function () {
  try {
    const { menu, modifications } = await this.populate({
      path: "menu",
      populate: "modifications",
    })
      .populate("modifications")
      .execPopulate();
    return { menuItems: menu, modifications };
  } catch (error) {
    return { error, functionName: "getMenu" };
  }
};

vendorSchema.methods.addMenuItem = async function (properties) {
  try {
    const savedMenuItem = await new MenuItem(properties).save();
    this.menu.push(savedMenuItem._id);
    const savedVendor = await this.save();
    await savedVendor
      .populate({ path: "menu", populate: "modifications" })
      .execPopulate();
    return savedVendor.menu;
  } catch (error) {
    return { error, functionName: "addMenuItem" };
  }
};

vendorSchema.methods.removeMenuItem = async function (menuItemId) {
  try {
    this.menu.pull(menuItemId);
    const savedVendor = await this.save();
    await savedVendor
      .populate({ path: "menu", populate: "modifications" })
      .execPopulate();
    return savedVendor.menu;
  } catch (error) {
    return { error, functionName: "removeMenuItem" };
  }
};

vendorSchema.methods.editMenuItem = async function (menuItemId, changes) {
  try {
    const whiteList = [
      "name",
      "description",
      "imageUrl",
      "price",
      "modifications",
    ];
    const menuItem = await MenuItem.findById(menuItemId);
    whiteList.forEach((property) => {
      if (changes[property] !== undefined) {
        menuItem[property] = changes[property];
      }
    });
    menuItem.modifiedOn = Date.now();
    await menuItem.save();
    const savedVendor = await this.save();
    await savedVendor
      .populate({ path: "menu", populate: "modifications" })
      .execPopulate();
    return savedVendor.menu;
  } catch (error) {
    return { error, functionName: "editMenuItem" };
  }
};

vendorSchema.methods.addModification = async function (modification) {
  try {
    const optionsWithoutBlanks = modification.options.filter(
      (option) => option.name
    );
    modification.options = optionsWithoutBlanks;
    const newModification = await new Modification(modification).save();
    this.modifications.push(newModification._id);
    await this.save();
    const vendorWithModifications = await this.populate(
      "modifications"
    ).execPopulate();
    return vendorWithModifications.modifications;
  } catch (error) {
    return { error, functionName: "addModification" };
  }
};

vendorSchema.methods.removeModification = async function (modificationId) {
  try {
    const vendorWithMenu = await this.populate("menu").execPopulate();
    const updatedMenu = vendorWithMenu.menu.map(async (menuItem) => {
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
  } catch (error) {
    return { error, functionName: "removeModification" };
  }
};

vendorSchema.methods.editModification = async function (
  modificationId,
  changes
) {
  try {
    const whiteList = ["options", "name", "type", "defaultOptionIndex"];
    const modification = await Modification.findById(modificationId);
    whiteList.forEach((property) => {
      if (changes[property] !== undefined) {
        modification[property] = changes[property];
      }
    });
    await modification.save();
    const vendorWithModifications = await this.populate(
      "modifications"
    ).execPopulate();
    return vendorWithModifications.modifications;
  } catch (error) {
    return { error, functionName: "editModification" };
  }
};

vendorSchema.methods.completeOrder = async function (orderId) {
  try {
    const foundOrder = await Order.findById(orderId).populate("customer");
    const { customer } = foundOrder;
    customer.activeOrders.pull(orderId);
    customer.completedOrders.push(orderId);
    this.activeOrders.pull(orderId);
    this.completedOrders.push(orderId);
    await foundOrder.changeDisposition("COMPLETE");
    await customer.save();
    const savedVendor = await this.save();
    await savedVendor
      .populate({
        path: "activeOrders completedOrders",
        populate: "orderItems",
      })
      .execPopulate();
    return savedVendor;
  } catch (error) {
    return { error, functionName: "completeOrder" };
  }
};

vendorSchema.methods.deliverOrder = async function (orderId) {
  try {
    const foundOrder = await Order.findById(orderId).populate("customer");
    const { customer } = foundOrder;
    customer.completedOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    this.completedOrders.pull(orderId);
    this.orderHistory.push(orderId);
    await foundOrder.changeDisposition("DELIVERED");
    await customer.save();
    const savedVendor = await this.save();
    await savedVendor
      .populate({
        path: "completedOrders orderHistory",
        populate: "orderItems",
      })
      .execPopulate();
    return savedVendor;
  } catch (error) {
    return { error, functionName: "deliverOrder" };
  }
};

vendorSchema.methods.refundOrder = async function (orderId) {
  try {
    const order = await Order.findById(orderId);
    const customer = await Customer.findById(order.customer);
    if (order.vendor.toString() !== this._id.toString()) {
      return { error: { message: "Unauthorized" } };
    }
    const charge = await Payment.refundCharge(order.chargeId);
    if (charge.error) {
      return { error: charge.error, functionName: "chargeToCard" };
    }
    const refundedOrder = await order.update({
      disposition: "CANCELED",
    });
    customer.activeOrders.pull(order._id);
    customer.completedOrders.pull(order._id);
    customer.orderHisory.push(order._id);
    this.activeOrders.pull(order._id);
    this.completedOrders.pull(order._id);
    this.orderHisory.push(order._id);
    await customer.save();
    await this.save();
    await emailTransporter.sendMail({
      to: this.email,
      subject: `Your order for ${vendor.businessName}.`,
      html: "Refunded",
    });
    await emailTransporter.sendMail({
      to: vendor.email,
      subject: `Order refunded!`,
      html: "Refunded",
    });
    return refundedOrder;
  } catch (error) {
    return { error, functionName: "chargeCartToCard" };
  }
};

module.exports = mongoose.model("Vendor", vendorSchema);
