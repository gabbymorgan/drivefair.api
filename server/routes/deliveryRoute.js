const express = require("express");
const Driver = require("../models/driver");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .post("/addToRoute", async (req, res) => {
    try {
      const { orderId, driverId } = req.body;
      const driver = await Driver.findById(driverId);
      const route = await driver.addToRoute(orderId);
      if (route.error) {
        const { error, functionName } = route;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({
        route,
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/", async (req, res) => {
    try {
      const route = await req.user.getRoute();
      res.status(200).json({ route });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/acceptOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      console.log({ orderId });
      const route = await req.user.getRoute();
      const updatedRoute = await route.acceptOrder(orderId);
      if (updatedRoute.error) {
        logError(updatedRoute.error, req, updatedRoute.functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/pickUpOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const route = await req.user.getRoute();
      const updatedRoute = await route.pickUpOrder(orderId);
      if (updatedRoute.error) {
        logError(updatedRoute.error, req, updatedRoute.functionName);
        return res.status(500).json({ error: updatedRoute.error });
      }
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/deliverOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const route = await req.user.getRoute();
      const updatedRoute = await route.deliverOrder(orderId);
      if (updatedRoute.error) {
        logError(updatedRoute.error, req, updatedRoute.functionName);
        return res.status(500).json({ error });
      }
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/rejectOrder", async (req, res) => {
    try {
      const { orderId } = req.body;
      const route = await req.user.getRoute();
      const updatedRoute = await route.rejectOrder(orderId);
      if (updatedRoute.error) {
        logError(updatedRoute.error, req, updatedRoute.functionName);
        return res.status(500).json({ error: updatedRoute.error });
      }
      res.status(200).json({ route: updatedRoute });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  });

module.exports = router;
