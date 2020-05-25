const express = require("express");
const Order = require("../models/order");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .get("/", async (req, res) => {
    try {
      const driver = req.user;
      await driver
        .populate({
          path: "orders",
          populate: {
            path: "customer vendor address orderItems",
            populate: "menuItem modifications",
          },
        })
        .execPopulate();
      res.status(200).json({ orders: driver.orders });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/acceptOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const order = await Order.findById(orderId);
      const response = await order.driverAcceptOrder(driver._id);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      res.status(200).json(response);
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/pickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const order = await Order.findById(orderId);
      const response = await order.driverPickUpOrder(driver._id);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      res.status(200).json(response);
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const order = await Order.findById(orderId);
      const response = await order.driverDeliverOrder(driver._id);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      res.status(200).json(response);
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/rejectOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const order = await Order.findById(orderId);
      const response = await order.driverRejectOrder(driver._id);
      res.status(200).json(response);
    } catch (error) {
      return await logError(response.error, req, res);
    }
  });

module.exports = router;
