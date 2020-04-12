const express = require("express");
const { createCharge } = require("../services/payment");
const { emailTransporter } = require("../services/communications");
const orderComplete = require("../constants/static-pages/order-complete");

const router = express.Router();

router
  .post("/addToCart", async (req, res) => {
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
  })
  .post("/removeFromCart", async (req, res) => {
    try {
      const cart = await req.user.getCart();
      const { orderItemId } = req.body;
      await cart.removeOrderItem(orderItemId);
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
      console.log({ error });
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
      res.status(500).json({ error });
    }
  })
  .get("/cart", async (req, res) => {
    try {
      res.status(200).json({ savedCart: await req.user.getCart() });
    } catch (error) {
      console.log({ error });
      res.status(500).json({ error });
    }
  })
  .put("/updatePayment", async (req, res) => {})
  .post("/fill", async (req, res) => {
    const { orderId } = req.query;
  })
  .post("/arrive", async (req, res) => {})
  .post("/deliver", async (req, res) => {
    const { orderId } = req.query;
  });

module.exports = router;
