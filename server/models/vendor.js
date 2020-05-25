const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { ObjectId } = mongoose.Schema.Types;

const Order = require("./order");
const Modification = require("./modification");
const MenuItem = require("./menuItem");
const Driver = require("./driver");
const Authentication = require("../services/authentication");
const Communications = require("../services/communications");
const CustomerOrderStatus = require("../constants/static-pages/customer-order-status");
const VendorOrderStatus = require("../constants/static-pages/vendor-order-status");
const Payment = require("../services/payment");

const vendorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    index: true,
    maxlength: 64,
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: {
    type: String,
    required: [true, "Password is required"],
    maxlength: 128,
  },
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
  businessName: {
    type: String,
    required: [true, "Business name is required"],
    unique: true,
    maxlength: 128,
  },
  logoUrl: {
    type: String,
    default: "e7NBE6u",
    validator: function (imageUrl) {
      return /^\w+$/.test(imageUrl);
    },
    errorMessage: (props) => `${props.value} is not a valid imgur URI path!`,
  },
  menu: [{ type: ObjectId, ref: "MenuItem" }],
  modifications: [{ type: ObjectId, ref: "Modification" }],
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  activeOrders: [{ type: ObjectId, ref: "Order" }],
  readyOrders: [{ type: ObjectId, ref: "Order" }],
  orderHistory: [{ type: ObjectId, ref: "Order" }],
  preferredDrivers: [{ type: ObjectId, ref: "Driver" }],
  blockedDrivers: [{ type: ObjectId, ref: "Driver" }],
  blockedCustomers: [{ type: ObjectId, ref: "Customer" }],
  deviceTokens: [String],
  emailSettings: {
    type: Object,
    default: {
      ORDER_PAID: true,
      ORDER_DELIVERED: true,
      ORDER_REFUNDED: true,
    },
  },
  notificationSettings: { type: Object, default: {} },
});

vendorSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

vendorSchema.methods.sendEmail = async function ({
  setting,
  subject,
  text,
  html,
}) {
  try {
    if (this.emailSettings[setting] || setting === "ACCOUNT") {
      return await Communications.sendMail({
        to: this.email,
        subject,
        text,
        html,
      });
    }
    return {
      error: {
        message: `Driver has turned off email setting: ${setting}`,
        status: 401,
      },
    };
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "sendEmail", status: 200 } };
  }
};

vendorSchema.methods.sendPushNotification = async function ({
  setting,
  title,
  body,
  data,
  senderId,
  senderModel,
}) {
  if (setting && this.notificationSettings[setting]) {
    const message = new Message({
      recipient: this._id,
      recipientModel: "Vendor",
      sender: senderId,
      senderModel,
      title,
      body,
      data,
      deviceTokens: this.deviceTokens,
    });
    return await message.save();
  }
  return {
    error: {
      message: `Driver has turned off notification setting: ${setting}`,
      status: 200,
    },
  };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "editVendor" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "getMenu" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "addMenuItem" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "removeMenuItem" } };
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
    menuItem.modifiedOn = new Date();
    await menuItem.save();
    const savedVendor = await this.save();
    await savedVendor
      .populate({ path: "menu", populate: "modifications" })
      .execPopulate();
    return savedVendor.menu;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "editMenuItem" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "addModification" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "removeModification" } };
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
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "editModification" } };
  }
};

vendorSchema.methods.readyOrder = async function (orderId) {
  try {
    const order = await Order.findById(orderId).populate("customer driver");
    const { customer, driver } = order;
    customer.activeOrders.pull(orderId);
    customer.readyOrders.push(orderId);
    this.activeOrders.pull(orderId);
    this.readyOrders.push(orderId);
    order.disposition = "READY";
    order.actualReadyTime = new Date();
    await order.save();
    await customer.save();
    await this.save();
    await this.populate({
      path: "activeOrders readyOrders",
      populate: {
        path: "vendor customer address orderItems",
        select: "-password -email",
        populate: "menuItem",
      },
    }).execPopulate();
    if (driver) {
      await driver.notifyOrderReady({ vendor: this, order });
    }
    return this;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "readyOrder" } };
  }
};

vendorSchema.methods.customerPickUpOrder = async function (orderId) {
  try {
    const order = await Order.findById(orderId).populate("customer");
    const { customer } = order;
    customer.readyOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    this.readyOrders.pull(orderId);
    this.orderHistory.push(orderId);
    order.disposition = "DELIVERED";
    await order.save();
    await customer.save();
    const savedVendor = await this.save();
    await savedVendor
      .populate({
        path: "readyOrders orderHistory",
        populate: "orderItems address",
      })
      .execPopulate();
    return savedVendor;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "deliverOrder" } };
  }
};

vendorSchema.methods.refundOrder = async function (orderId) {
  try {
    const order = await Order.findById(orderId);
    await order.populate("customer driver").execPopulate();
    const { customer, driver } = order;
    if (order.vendor.toString() !== this._id.toString()) {
      return { error: { message: "Unauthorized" } };
    }
    const charge = await Payment.refundCharge(order.chargeId);
    if (charge.error) {
      const errorString = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      );
      return { error: { errorString, functionName: "refundOrder" } };
    }
    order.disposition = "CANCELED";
    customer.activeOrders.pull(orderId);
    customer.readyOrders.pull(orderId);
    customer.orderHistory.push(orderId);
    this.activeOrders.pull(orderId);
    this.readyOrders.pull(orderId);
    this.orderHistory.push(orderId);
    if (driver) {
      driver.orders.pull(orderId);
      driver.orderHistory.push(orderId);
      await driver.save();
      await driver.notifyOrderCanceled({ vendor: this, order });
    }
    await customer.save();
    await this.save();
    const refundedOrder = await order.save();
    const vendorToken = await Authentication.signEmailToken(this, "Vendor");
    const customerToken = await Authentication.signEmailToken(
      customer,
      "Customer"
    );
    await this.sendEmail({
      setting: "ORDER_REFUNDED",
      subject: `Your order for ${this.businessName}.`,
      html: VendorOrderStatus.refunded(
        customer.firstName,
        customer.lastName,
        vendorToken
      ),
    });
    await customer.sendEmail({
      setting: "ORDER_REFUNDED",
      subject: `Order refunded!`,
      html: CustomerOrderStatus.refunded(this.businessName, customerToken),
    });
    return refundedOrder;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "refundOrder" } };
  }
};

vendorSchema.methods.addDriver = async function (driverId) {
  try {
    const driver = await new Driver.findById(driverId);
    if (!driver) {
      return {
        error: { message: "No driver by that Id;" },
        functionName: "addDriver",
      };
    }
    this.drivers.push(driverId);
    await this.save();
    const vendorWithDrivers = await this.populate("drivers").execPopulate();
    return vendorWithDrivers.modifications;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "addModification" } };
  }
};

vendorSchema.methods.removeDriver = async function (driverId) {
  try {
    this.drivers.pull(driverId);
    await this.save();
    const vendorWithDrivers = await this.populate("drivers").execPopulate();
    return vendorWithDrivers.modifications;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "addModification" } };
  }
};

module.exports = mongoose.model("Vendor", vendorSchema);
