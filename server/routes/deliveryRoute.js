const express = require("express");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .get("/", async (req, res) => {
    try {
      const driver = req.user;
      const route = await driver.getRoute();
      res.status(200).json({ route });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/acceptOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await req.user.getRoute();
      const response = await route.acceptOrder(orderId);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/pickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.pickUpOrder(orderId);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.deliverOrder(orderId, driver);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/rejectOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const driver = req.user;
      const route = await driver.getRoute();
      const response = await route.rejectOrder(orderId);
      if (response.error) {
        return await logError(response.error, req, res);
      }
      const updatedRoute = await driver.getRoute();
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      return await logError(error, req, res);
    }
  });

module.exports = router;
