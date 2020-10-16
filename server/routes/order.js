const express = require("express");
const logError = require("../services/errorLog");
const Order = require("../models/order");
const Driver = require("../models/driver");
const Vendor = require("../models/vendor");
const Customer = require("../models/customer");

const router = express.Router();

router
  .post("/addToCart", async (req, res) => {
    try {
      const customer = req.user;
      const { menuItemId, modifications, vendorId } = req.body;
      let cart = await customer.getCart(true);
      if (!cart || !cart.vendor || cart.vendor.toString() !== vendorId)
        cart = await customer.createCart(vendorId);
      const savedCart = await cart.addOrderItem(menuItemId, modifications);
      res.status(200).json({ savedCart });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/removeFromCart", async (req, res) => {
    try {
      const cart = await req.user.getCart(true);
      const { orderItemId } = req.body;
      const savedCart = await cart.removeOrderItem(orderItemId);
      if (savedCart.error) {
        return await logError(savedCart.error, req, res);
      }
      res.status(200).json({ savedCart });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/setTip", async (req, res) => {
    try {
      const cart = await req.user.getCart();
      cart.tip = req.body.tipAmount;
      const savedCart = await cart.save();
      res.status(200).json({ savedCart });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/pay", async (req, res) => {
    try {
      const chargedOrder = await req.user.chargeCartToCard(
        req.body.paymentDetails.token.id
      );
      if (chargedOrder.error) {
        return await logError(chargedOrder.error, req, res);
      }
      res.status(200).json({ chargedOrder });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/cart", async (req, res) => {
    try {
      const savedCart = await req.user.getCart();
      if (savedCart.error) {
        return await logError(savedCart.error, req, res);
      }
      res.status(200).json({ savedCart });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/customerSetOrderMethod", async (req, res) => {
    try {
      const customerCart = await req.user.getCart();
      customerCart.method = req.body.orderMethod;
      const savedCart = await customerCart.save();
      res.status(200).json({ savedCart });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/active", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "activeOrders",
          populate: {
            path: "vendor customer address orderItems",
            select: "-password -email",
            populate: "menuItem",
          },
        })
        .execPopulate();
      res.status(200).json({ activeOrders: userWithOrders.activeOrders });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/ready", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "readyOrders",
          populate: {
            path: "vendor customer address orderItems",
            select: "-password -email",
            populate: "menuItem",
          },
        })
        .execPopulate();
      res.status(200).json({ readyOrders: userWithOrders.readyOrders });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/history", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "orderHistory",
          populate: {
            path: "vendor customer driver orderItems",
            select: "-password -email",
            populate: "menuItem",
          },
        })
        .execPopulate();
      res.status(200).json({ orderHistory: userWithOrders.orderHistory });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/vendorAcceptOrder", async (req, res) => {
    try {
      const { orderId, driverId, timeToReady } = req.body;
      const vendor = req.user;
      if (!vendor.activeOrders.includes(orderId)) {
        return await logError(
          { message: "Order not found.", status: 404 },
          req,
          res
        );
      }
      const order = await Order.findById(orderId);
      const acceptOrderResponse = await order.vendorAcceptOrder({
        vendor,
        timeToReady,
      });
      if (acceptOrderResponse.error) {
        const { error } = acceptOrderResponse;
        return await logError(error, req, res);
      }
      const requestDriverResponses =
        order.method === "DELIVERY"
          ? await order.requestDrivers([driverId])
          : null;
      res.status(200).json({
        activeOrders: acceptOrderResponse.activeOrders,
        requestDriverResponses,
      });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/readyOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedVendor = await req.user.readyOrder(orderId);
      if (updatedVendor.error) {
        const { error } = updatedVendor;
        return await logError(error, req, res);
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        readyOrders: updatedVendor.readyOrders,
      });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedVendor = await req.user.deliverOrder(orderId);
      if (updatedVendor.error) {
        const { error } = updatedVendor;
        return await logError(error, req, res);
      }
      res.status(200).json({
        orderHistory: updatedVendor.orderHistory,
        readyOrders: updatedVendor.readyOrders,
      });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/customerPickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedCustomer = await req.user.customerPickUpOrder(orderId);
      if (updatedCustomer.error) {
        const { error } = updatedCustomer;
        return await logError(error, req, res);
      }
      res.status(200).json({
        orderHistory: updatedCustomer.orderHistory,
        readyOrders: updatedCustomer.readyOrders,
      });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/refundOrder", async (req, res) => {
    try {
      const { orderId, password } = req.body;
      const vendor = req.user;
      const passwordIsValid = await vendor.validatePassword(password);
      if (!passwordIsValid) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          req,
          res
        );
      }
      const updatedVendor = await vendor.refundOrder(orderId);
      if (updatedVendor.error) {
        const { error } = updatedVendor;
        return await logError(error, req, res);
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        readyOrders: updatedVendor.readyOrders,
        orderHistory: updatedVendor.orderHistory,
      });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/requestDrivers", async (req, res) => {
    try {
      const { driverIds, orderId } = req.body;
      const { userModel } = req;
      if (userModel !== "Vendor") {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          req,
          res
        );
      }
      const order = await Order.findById(orderId);
      const requestDriverResponses = await order.requestDrivers(driverIds);
      if (requestDriverResponses.error) {
        return await logError(requestDriverResponses.error, req, res);
      }
      res.status(200).json({ requestDriverResponses });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/sendChatMessage", async (req, res) => {
    const models = {
      Driver,
      Vendor,
      Customer,
    };
    const { user, userModel } = req;
    const { recipientId, recipientModel, orderId, chatMessage } = req.body;
    const fromName = user.firstName
      ? user.firstName + customer.lastName[0]
      : user.businessName;
    const recipient = models[recipientModel].findById(recipientId);
    const response = await recipient.sendMessage({
      title: `New message from ${fromName}!`,
      body: chatMessage,
      data: {
        messageType: "CHAT",
        fromName,
        fromModel: userModel,
        fromId: user._id,
        orderId,
      },
      senderId,
      senderModel,
    });
    if (response.error) {
      return await logError(response.error, req, res);
    }
    res.status(200).json({ response });
  })
  .get("/chat", (req, res) => {})
  .post("/arriveForPickup", async (req, res) => {})
  .post("/updatePayment", async (req, res) => {});

module.exports = router;
