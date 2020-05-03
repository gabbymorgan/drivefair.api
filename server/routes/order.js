const express = require("express");
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
      res.status(200).json({ savedCart: await req.user.getCart() });
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

  .get("/activeOrders", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "activeOrders",
          populate: {
            path: "vendor customer orderItems",
            select: "-password",
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
  .get("/completedOrders", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "completedOrders",
          populate: {
            path: "vendor customer orderItems",
            select: "-password",
            populate: "menuItem",
          },
        })
        .execPopulate();
      res.status(200).json({ completedOrders: userWithOrders.completedOrders });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/orderHistory", async (req, res) => {
    try {
      const userWithOrders = await req.user
        .populate({
          path: "orderHistory",
          populate: {
            path: "vendor customer orderItems",
            select: "-password",
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
      const updatedVendor = await req.user.refundOrder(orderId);
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
