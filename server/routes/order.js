const express = require("express");
const Order = require("../models/order");
const { emailTransporter } = require("../services/communications");
const { validateToken } = require("../services/authentication");
const orderComplete = require("../constants/static-pages/order-complete");

const router = express.Router();

router
  .post("/new", async (req, res) => {
    try {
      const { vendorId } = req.body;
      const customer = req.user;
      const newOrder = new Order({
        customer: customer._id,
        vendor: vendorId
      });
      const savedOrder = await newOrder.save();
      res.status(200).json({ savedOrder });
    } catch (err) {
      console.log(err);
      res.status(500).send({ err });
    }
  })
  .post("/addOrderItem", async (req, res) => {
    try {
      const { orderId, menuItemId, modifications } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await req.user.addOrderItem({ name, description, price });
      res.status(200).json(req.user);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .post("/removeOrderItem", async (req, res) => {
    try {
      const { orderItemId } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await req.user.removeOrderItem(orderItemId);
      res.status(200).json(req.user);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .delete("/removeOrder", async (req, res) => {

  })
  .put("/pay", async (req, res) => {})
  .put("/updatePayment", async (req, res) => {})
  .post("/complete", async (req, res) => {})
  .post("/deliver", async (req, res) => {});

module.exports = router;
