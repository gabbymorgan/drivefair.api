const express = require("express");
const bcrypt = require("bcrypt");
const Driver = require("../models/driver");
const Order = require("../models/order");
const Communications = require("../services/communications");
const logError = require("../services/errorLog");
const {
  signToken,
  signEmailToken,
  validateEmailToken,
} = require("../services/authentication");
const EmailConfirmation = require("../constants/static-pages/email-confirmation");

const router = express.Router();

router
  .post("/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;
      const newDriver = new Driver({
        email,
        password: await bcrypt.hash(password, 10),
        firstName,
        lastName,
        phoneNumber,
      });
      const savedDriver = await newDriver.save();
      const token = await signToken(savedDriver, "Driver");
      const emailConfirmationToken = await signEmailToken(
        savedDriver,
        "Driver"
      );
      await savedDriver.sendEmail({
        subject: `Thanks for signing up, ${firstName}!`,
        html: EmailConfirmation.request(
          "drivers",
          firstName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ token, profile: savedDriver, userType: "driver" });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const foundDriver = await Driver.findOne({ email });
      if (!foundDriver) {
        return await logError(
          { message: "Incorrect username and/or password.", status: 401 },
          req,
          res
        );
      }
      const passwordIsValid = foundDriver.validatePassword(password);
      if (!passwordIsValid) {
        return await logError(
          { message: "Incorrect username and/or password.", status: 401 },
          req,
          res
        );
      }
      const token = await signToken(foundDriver, "Driver");
      res.status(200).json({ token, profile: foundDriver, userType: "driver" });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const isEmailToken = await validateEmailToken(req.query.token);
      if (!req.user || !isEmailToken) {
        return await logError(
          { message: "Unauthorized", status: 401 },
          req,
          res
        );
      }
      req.user.emailIsConfirmed = true;
      await req.user.save();
      res.status(200).send(EmailConfirmation.confirmed());
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      if (!profile) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          req,
          res
        );
      }
      res.status(200).json({ profile });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/sendConfirmationEmail", async (req, res) => {
    try {
      const driver = req.user;
      const emailConfirmationToken = await signEmailToken(driver, "Driver");
      await Communications.sendmail({
        to: driver.email,
        from: process.env.EMAIL_USER,
        subject: `Thanks for signing up, ${driver.firstName}!`,
        html: EmailConfirmation.request(
          "drivers",
          driver.firstName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ success: true });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/addDriver", async (req, res) => {
    try {
      const drivers = await req.user.addDriver(req.body.driverId);
      res.status(200).json({ drivers });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/removeDriver", async (req, res) => {
    try {
      const drivers = await req.user.removeDriver(req.body.driverId);
      res.status(200).json({ drivers });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/rostered", async (req, res) => {
    try {
      const drivers = await req.user.populate("drivers").execPopulate();
      res.status(200).json({ drivers });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/active", async (req, res) => {
    try {
      const drivers = await Driver.find({
        status: "ACTIVE",
        route: null,
      });
      res.status(200).json({ drivers });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/all", async (req, res) => {
    try {
      const drivers = await Driver.find();
      res.status(200).json({ drivers });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/toggleStatus", async (req, res) => {
    try {
      const status = await req.user.toggleStatus(req.body.status);
      if (status.error) {
        return await logError(status.error, req, res);
      }
      res.status(200).json({ status });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/setLocation", async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      const driver = req.user;
      driver.latitude = latitude;
      driver.longitude = longitude;
      const savedDriver = await driver.save();
      res.status(200).json({ savedDriver });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/addDeviceToken", async (req, res) => {
    try {
      const driver = req.user;
      const { deviceToken } = req.body;
      const addDeviceTokenResponse = await driver.addDeviceToken(deviceToken);
      if (addDeviceTokenResponse.error) {
        const { error, functionName } = addDeviceTokenResponse;
        return await logError(error, req, functionName);
      }
      res.status(200).json({ success: true });
    } catch (error) {
      return await logError(error, req, res);
    }
  });

module.exports = router;
