const express = require("express");
const Driver = require("../models/driver");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .get("/", async (req, res) => {
    try {
      const driver = req.user;
      const route = await driver.getRoute();
      res.status(200).json({ route });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/acceptOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await req.user.getRoute();
      const response = await route.acceptOrder(orderId);
      if (response.error) {
        logError(response.error, req, response.functionName);
        return res.status(500).json({ error: response.error });
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/pickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.pickUpOrder(orderId);
      if (response.error) {
        logError(response.error, req, response.functionName);
        return res.status(500).json({ error: response.error });
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.deliverOrder(orderId, driver);
      if (response.error) {
        logError(response.error, req, response.functionName);
        return res.status(500).json({ error });
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/rejectOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.rejectOrder(orderId);
      if (response.error) {
        logError(response.error, req, response.functionName);
        return res.status(500).json({ error: response.error });
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  });

module.exports = router;
