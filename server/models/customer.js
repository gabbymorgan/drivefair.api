const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("./order");
const Address = require("./address");
const { emailTransporter } = require("../services/communications");
const OrderStatus = require("../constants/static-pages/order-status");
const { createCharge } = require("../services/payment");
const { ObjectId } = mongoose.Schema.Types;

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 64,
  },
  emailIsConfirmed: { type: Boolean, default: false },
  password: { type: String, required: true, maxlength: 128 },
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
});

customerSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(this.password, password);
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
    return { error, functionName: "createCart" };
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
    return { error, functionName: "getCart" };
  }
};

customerSchema.methods.chargeCartToCard = async function (paymentToken) {
  try {
    const cart = await Order.findById(this.cart);
    if (cart.method === "DELIVERY" && !cart.address) {
      return {
        error: "Cannot complete order without address.",
        functionName: "chargeCartToCard",
      };
    }
    await cart.populate("vendor").execPopulate();
    cart.total = cart.subtotal + cart.tip;
    const { vendor } = cart;
    const charge = await createCharge(this, cart, vendor, paymentToken);
    if (charge.error) {
      return { error: charge.error, functionName: "chargeToCard" };
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
    const savedCart = await cart.save();
    emailTransporter.sendMail({
      to: this.email,
      from: '"Denton Delivers", gabby@gabriellapelton.com',
      subject: `Your order for ${vendor.businessName}.`,
      html: OrderStatus.paidAndBeingMade(this.firstName, vendor.businessName),
    });
    emailTransporter.sendMail({
      to: vendor.email,
      from: '"Denton Delivers", gabby@gabriellapelton.com',
      subject: `You have a new order for ${cart.method}!`,
      html: OrderStatus.paidAndBeingMade(this.firstName, vendor.businessName),
    });
    return savedCart;
  } catch (error) {
    return { error, functionName: "chargeCartToCard" };
  }
};

customerSchema.methods.selectAddress = async function (addressId) {
  try {
    const cart = await this.getCart();
    cart.address = addressId;
    await cart.save();
    return cart;
  } catch (error) {
    return { error };
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
