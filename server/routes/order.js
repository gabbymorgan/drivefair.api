const express = require("express");
const Order = require("../models/order");
const { emailTransporter } = require("../services/communications");
const { validateToken } = require("../services/authentication");
const orderComplete = require("../constants/static-pages/order-complete");

const router = express.Router();

router
  .post("/new", async (req, res) => {
    try {
      const { vendorId, orderItems, method } = req.body;
      console.log({orderItems})
      const customer = req.user;
      const newOrder = new Order({
        customer: customer._id,
        vendor: vendorId,
        method,
        orderItems
      });
      const savedOrder = await newOrder.save();
      res.status(200).json({ savedOrder });
    } catch (err) {
      console.log(err);
      res.status(500).send({ err });
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
