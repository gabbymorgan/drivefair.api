const express = require("express");
const Vendor = require("../models/vendor");
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
        await customer.createCart(orderItem, vendorId);
        return res.status(200).json({ savedCart: await req.user.getCart() });
      }
      await customerCart.addOrderItem(orderItem);
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
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
  .post("/updatePayment", async (req, res) => {})
  .post("/completeOrder", async (req, res) => {
    try {
      const { orderId } = req.query;
      const order = Order.findById(orderId);
      const completedOrder = await order.markComplete();
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/arriveForPickup", async (req, res) => {})
  .post("/deliverOrder", async (req, res) => {
    const { orderId } = req.query;
  });

module.exports = router;
