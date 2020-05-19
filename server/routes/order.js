const express = require("express");
const logError = require("../services/errorLog");
const Order = require("../models/order");
const Driver = require("../models/driver");

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
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/removeFromCart", async (req, res) => {
    try {
      const cart = await req.user.getCart(true);
      const { orderItemId } = req.body;
      const savedCart = await cart.removeOrderItem(orderItemId);
      if (savedCart.error) {
        logError(savedCart.error, req, savedCart.functionName);
        return res.status(500).json({ error: savedCart.error });
      }
      res.status(200).json({ savedCart });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/setTip", async (req, res) => {
    try {
      const cart = await req.user.getCart();
      cart.tip = req.body.tipAmount;
      const savedCart = await cart.save();
      res.status(200).json({ savedCart });
    } catch (error) {
      logError(error, req);
    }
  })
  .post("/pay", async (req, res) => {
    try {
      const chargedOrder = await req.user.chargeCartToCard(
        req.body.paymentDetails.token.id
      );
      if (chargedOrder.error) {
        logError(chargedOrder.error, req, chargedOrder.functionName);
        return res.status(500).json({ error: chargedOrder.error });
      }
      res.status(200).json({ chargedOrder });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/cart", async (req, res) => {
    try {
      const savedCart = await req.user.getCart();
      if (savedCart.error) {
        logError(savedCart.error, req, savedCart.functionName);
        return res.status(500).json({});
      }
      res.status(200).json({ savedCart });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/customerSetOrderMethod", async (req, res) => {
    try {
      const customerCart = await req.user.getCart();
      customerCart.method = req.body.orderMethod;
      const savedCart = await customerCart.save();
      res.status(200).json({ savedCart });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
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
      await logError(error, req);
      res.status(500).json({ error });
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
      await logError(error, req);
      res.status(500).json({ error });
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
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/vendorAcceptOrder", async (req, res) => {
    try {
      const { orderId, selectedDriverId, timeToReady } = req.body;
      const vendor = req.user;
      if (!vendor.activeOrders.includes(orderId)) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
      }
      const order = await Order.findById(orderId);
      const selectedDriver = await Driver.findById(selectedDriverId);
      const acceptOrderResponse = await order.vendorAcceptOrder({
        vendor,
        selectedDriver,
        timeToReady,
      });
      if (acceptOrderResponse.error) {
        const { error, functionName } = acceptOrderResponse;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        activeOrders: acceptOrderResponse.activeOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/requestDriver", async (req, res) => {
    try {
      const { orderId, selectedDriverId } = req.body;
      const vendor = req.user;
      if (!vendor.activeOrders.includes(orderId)) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
      }
      const selectedDriver = await Driver.findById(selectedDriverId);
      const updatedOrder = await selectedDriver.requestDriver(orderId);
      if (updatedOrder.error) {
        logError(updatedOrder.error, req, updatedOrder.functionName);
        return res.status(500).json({ error: updatedOrder.error });
      }
      const { activeOrders } = await vendor
        .populate({
          path: "activeOrders",
          populate: {
            path: "vendor customer address orderItems",
            select: "-password -email",
            populate: "menuItem",
          },
        })
        .execPopulate();
      res.status(200).json({
        activeOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/readyOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedVendor = await req.user.readyOrder(orderId);
      if (updatedVendor.error) {
        const { error, functionName } = updatedVendor;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        readyOrders: updatedVendor.readyOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedVendor = await req.user.deliverOrder(orderId);
      if (updatedVendor.error) {
        const { error, functionName } = updatedVendor;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        orderHistory: updatedVendor.orderHistory,
        readyOrders: updatedVendor.readyOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/customerPickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedCustomer = await req.user.customerPickUpOrder(orderId);
      if (updatedCustomer.error) {
        const { error, functionName } = updatedCustomer;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        orderHistory: updatedCustomer.orderHistory,
        readyOrders: updatedCustomer.readyOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/refundOrder", async (req, res) => {
    try {
      const { orderId, password } = req.body;
      const vendor = req.user;
      const passwordIsValid = await vendor.validatePassword(password);
      if (!passwordIsValid) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
      }
      const updatedVendor = await vendor.refundOrder(orderId);
      if (updatedVendor.error) {
        const { error, functionName } = updatedVendor;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        readyOrders: updatedVendor.readyOrders,
        orderHistory: updatedVendor.orderHistory,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/arriveForPickup", async (req, res) => {
    // mvake this a push notification or something and NOT a disposition
  })
  .post("/updatePayment", async (req, res) => {});

module.exports = router;
