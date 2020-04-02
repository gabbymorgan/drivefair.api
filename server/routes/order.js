const express = require("express");
const moment = require("moment");
const Order = require("../models/order");
const Customer = require("../models/customer");
const { emailTransporter } = require("../services/communications");

const router = express.Router();

router
  .post("/", async (req, res) => {
    try {
      const { order, customerId } = req.body;
      const newOrder = new Order({ content: order, customerId });
      const savedOrder = await newOrder.save();
      const foundCustomer = await Customer.findOne({ customerId });
      foundCustomer.orders.push(savedOrder._id);
      res.status(200).json({ savedOrder });
      await emailTransporter.sendMail({
        to: process.env.EMAIL_RECIPIENT,
        subject: `New order from ${customerId}`,
        text: `customerId: ${customerId}\n\norder: ${order}`
      });
      await foundCustomer.save();
    } catch (err) {
      console.log(err);
    }
  })
  .get("/mine", async (req, res) => {
    try {
      const { token } = req.query;
      const foundCustomer = await Customer.findOne({ token }).populate("orders");
      if (!foundCustomer) {
        return res.status(404).json({ order: "No user found." });
      }
      let { orders, lastVisited, visits } = foundCustomer;
      res.status(200).json({ orders });
      if (
        moment()
          .startOf("day")
          .isAfter(lastVisited)
      ) {
        await emailTransporter.sendMail({
          to: process.env.EMAIL_RECIPIENT,
          subject: `${token} returns`,
          text: `Customer ${token} has returned`
        });
      }
      lastVisited = Date.now();
      visits.push(lastVisited);
      await foundCustomer.update({ lastVisited, visits });
    } catch (err) {
      console.log(err);
    }
  });

module.exports = router;