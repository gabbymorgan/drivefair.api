const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Order = require("./order");
const Address = require("./address");
const Authentication = require("../services/authentication");
const Communications = require("../services/communications");
const CustomerOrderStatus = require("../constants/static-pages/customer-order-status");
const VendorOrderStatus = require("../constants/static-pages/vendor-order-status");
const { createCharge } = require("../services/payment");

const { ObjectId } = mongoose.Schema.Types;

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required."],

    unique: true,
    index: true,
    maxlength: 64,
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: {
    type: String,
    required: [true, "Password is required."],
    maxlength: 128,
  },
  firstName: { type: String, maxlength: 64 },
  lastName: { type: String, maxlength: 64 },
  phoneNumber: { type: String },
  addresses: [{ type: ObjectId, ref: "Address" }],
  createdOn: { type: Date, default: Date.now },
  visits: [{ type: Date }],
  lastVisited: { type: Date, default: Date.now },
  cart: { type: ObjectId, ref: "Order" },
  activeOrders: [{ type: ObjectId, ref: "Order" }],
  readyOrders: [{ type: ObjectId, ref: "Order" }],
  orderHistory: [{ type: ObjectId, ref: "Order" }],
  deviceTokens: [String],
  emailSettings: {
    type: Object,
    default: {
      ORDER_READY_FOR_PICKUP: true,
      ORDER_PAID: true,
      ORDER_DELIVERED: true,
      ORDER_REFUNDED: true,
    },
  },
  notificationSettings: { type: Object, default: {} },
});

customerSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
};

customerSchema.methods.sendEmail = async function ({
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
        status: 200,
      },
    };
  } catch (error) {
    return { error: { ...error, functionName: "sendEmail", status: 200 } };
  }
};

customerSchema.methods.sendPushNotification = async function ({
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
      recipientModel: "Customer",
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

customerSchema.methods.createCart = async function (vendorId) {
  try {
    const newCart = new Order({
      customer: this._id,
      vendor: vendorId,
    });
    this.cart = newCart;
    await newCart.save();
    await this.save();
    return this.cart;
  } catch (error) {
    return { error: { ...error, functionName: "createCart" } };
  }
};

customerSchema.methods.getCart = async function (unpopulated) {
  try {
    let cart = await Order.findById(this.cart);
    if (!cart) {
      cart = new Order({ customer: this._id });
    }
    if (!unpopulated) {
      await cart
        .populate({
          path: "orderItems",
          populate: { path: "menuItem" },
        })
        .execPopulate();
    }
    return cart;
  } catch (error) {
    return { error: { ...error, functionName: "getCart" } };
  }
};

customerSchema.methods.chargeCartToCard = async function (paymentToken) {
  try {
    const cart = await Order.findById(this.cart);
    if (cart.method === "DELIVERY" && !cart.address) {
      return {
        error: {
          message: "Cannot complete order without address.",
          functionName: "chargeCartToCard",
        },
      };
    }
    await cart.populate("vendor").execPopulate();
    cart.total = cart.subtotal + cart.tip;
    const { vendor } = cart;
    const charge = await createCharge(this, cart, vendor, paymentToken);
    if (charge.error) {
      return { error: { ...charge.error, functionName: "chargeToCard" } };
    }
    cart.disposition = "PAID";
    cart.chargeId = charge.id;
    cart.amountPaid = charge.amount;
    cart.modifiedOn = new Date();
    vendor.activeOrders.push(cart._id);
    this.activeOrders.push(cart._id);
    this.cart = null;
    await vendor.save();
    await this.save();
    await cart.save();
    const vendorToken = await Authentication.signEmailToken(vendor, "Vendor");
    const customerToken = await Authentication.signEmailToken(this, "Customer");
    await this.sendEmail({
      setting: "ORDER_PAID",
      subject: `Your order for ${vendor.businessName}.`,
      html: CustomerOrderStatus.paid(
        this.firstName,
        vendor.businessName,
        customerToken
      ),
    });
    await vendor.sendEmail({
      setting: "ORDER_PAID",
      subject: `You have a new order for ${cart.method}!`,
      html: VendorOrderStatus.paid(this.firstName, this.lastName, vendorToken),
    });
    return cart;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return {
      error: { message: errorString, functionName: "chargeCartToCard" },
    };
  }
};

customerSchema.methods.selectAddress = async function (addressId) {
  try {
    const cart = await this.getCart();
    cart.address = addressId;
    await cart.save();
    return cart;
  } catch (error) {
    return { error: { ...error, functionName: "selectAddress" } };
  }
};

customerSchema.methods.addAddress = async function (address) {
  try {
    const newAddress = await new Address(address).save();
    this.addresses.push(newAddress._id);
    const savedCustomer = await this.save();
    const { addresses } = await savedCustomer
      .populate("addresses")
      .execPopulate();
    return addresses;
  } catch (error) {
    return { error };
  }
};

customerSchema.methods.deleteAddress = async function (addressId) {
  try {
    await Address.findByIdAndDelete(addressId);
    this.addresses.pull(addressId);
    await this.save();
    return this.addresses;
  } catch (error) {
    return { error };
  }
};

customerSchema.methods.editAddress = async function (addressId, changes) {
  try {
    const { activeOrders, readyOrders } = await this.populate(
      "activeOrders, readyOrders"
    ).execPopulate();
    if (
      [...activeOrders, ...readyOrders].find(
        (order) => order.address.toString() === addressId.toString()
      )
    ) {
      return {
        error:
          "Address has an order in process. Changing the address now may have unintended consequences.",
      };
    }
    const whiteList = [
      "street",
      "unit",
      "city",
      "state",
      "zip",
      "latitude",
      "longitude",
    ];
    const address = await Address.findById(addressId);
    whiteList.forEach((property) => {
      if (changes[property] !== undefined) {
        address[property] = changes[property];
      }
    });
    address.modifiedOn = new Date();
    await address.save();
    const { addresses } = await this.populate("addresses").execPopulate();
    return addresses;
  } catch (error) {
    return { error };
  }
};

module.exports = mongoose.model("Customer", customerSchema);
