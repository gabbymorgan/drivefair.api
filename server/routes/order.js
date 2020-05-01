const express = require("express");
const Vendor = require("../models/vendor");
const Order = require("../models/order");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .post("/addToCart", async (req, res) => {
    try {
      const customer = req.user;
      const customerCart = await customer.getCart();
      const { orderItem, vendorId } = req.body;
      if (
        !customerCart ||
        !customerCart.vendor ||
        vendorId != customerCart.vendor._id
      ) {
        const savedCart = await customer.createCart(orderItem, vendorId);
        return res.status(200).json({ savedCart });
      }
      await customerCart.addOrderItem(orderItem);
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
      console.log({ error });
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/removeFromCart", async (req, res) => {
    try {
      const cart = await req.user.getCart();
      const { orderItemId } = req.body;
      await cart.removeOrderItem(orderItemId);
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/pay", async (req, res) => {
    try {
      const chargedOrder = await req.user.chargeCartToCard(
        req.body.paymentDetails.token.id
      );
      res.status(200).json({ chargedOrder });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/cart", async (req, res) => {
    try {
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/activeOrders", async (req, res) => {
    try {
      const vendorWithOrders = await Vendor.findById(req.user._id).populate({
        path: "activeOrders",
        populate: {
          path: "customer orderItems",
          select: "-password",
          populate: "menuItem",
        },
      });
      res.status(200).json({ activeOrders: vendorWithOrders.activeOrders });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/completedOrders", async (req, res) => {
    try {
      const vendorWithOrders = await Vendor.findById(req.user._id).populate({
        path: "completedOrders",
        populate: {
          path: "customer orderItems",
          select: "-password",
          populate: "menuItem",
        },
      });
      res
        .status(200)
        .json({ completedOrders: vendorWithOrders.completedOrders });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/orderHistory", async (req, res) => {
    try {
      const vendorWithOrders = await Vendor.findById(req.user._id).populate({
        path: "orderHistory",
        populate: {
          path: "customer orderItems",
          select: "-password",
          populate: "menuItem",
        },
      });
      res.status(200).json({ orderHistory: vendorWithOrders.orderHistory });
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
  .post("/completeOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const updatedVendor = await req.user.completeOrder(orderId);
      if (updatedVendor.error) {
        logError(updatedVendor.error, req, updatedVendor.functionName);
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        completedOrders: updatedVendor.completedOrders,
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
        logError(updatedVendor.error, req, updatedVendor.functionName);
      }
      res.status(200).json({
        orderHistory: updatedVendor.orderHistory,
        completedOrders: updatedVendor.completedOrders,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/refundOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findById(orderId);
      const updatedVendor = await order.refundOrder();
      if (updatedVendor.error) {
        logError(updatedVendor.error, req, updatedVendor.functionName);
      }
      res.status(200).json({
        activeOrders: updatedVendor.activeOrders,
        completedOrders: updatedVendor.completedOrders,
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
