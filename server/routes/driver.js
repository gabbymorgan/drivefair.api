const express = require("express");
const bcrypt = require("bcrypt");
const Driver = require("../models/driver");
const Message = require("../models/message");
const {
  emailTransporter,
  sendPushNotification,
} = require("../services/communications");
const logError = require("../services/errorLog");
const {
  signToken,
  signEmailToken,
  validateEmailToken,
} = require("../services/authentication");
const emailConfirmation = require("../constants/static-pages/email-confirmation");

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
      res.status(200).json({ token, profile: savedDriver, userType: "driver" });
      await emailTransporter.sendMail({
        to: email,
        from: '"Denton Delivers", gabby@gabriellapelton.com',
        subject: `Thanks for signing up, ${firstName}!`,
        html: emailConfirmation.request(
          "drivers",
          firstName,
          emailConfirmationToken
        ),
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).send({ error });
    }
  })
  .post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const foundDriver = await Driver.findOne({ email });
      if (!foundDriver) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const passwordIsValid = foundDriver.validatePassword(password);
      if (!passwordIsValid) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const token = await signToken(foundDriver, "Driver");
      res.status(200).json({ token, profile: foundDriver, userType: "driver" });
    } catch (error) {
      await logError(error, req);
      res.status(500).send({ error });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const isEmailToken = await validateEmailToken(req.query.token);
      if (!req.user || !isEmailToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user.emailIsConfirmed = true;
      await req.user.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      if (!profile) {
        return res.status(401).json({ message: "Unauthorized." });
      }
      res.status(200).json({ profile });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/sendConfirmationEmail", async (req, res) => {
    try {
      const driver = req.user;
      const emailConfirmationToken = await signEmailToken(driver, "Driver");
      await emailTransporter.sendMail({
        to: driver.email,
        from: '"Denton Delivers", gabby@gabriellapelton.com',
        subject: `Thanks for signing up, ${driver.firstName}!`,
        html: emailConfirmation.request(
          "drivers",
          driver.firstName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ success: true });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/addDriver", async (req, res) => {
    try {
      const drivers = await req.user.addDriver(req.body.driverId);
      res.status(200).json({ drivers });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/removeDriver", async (req, res) => {
    try {
      const drivers = await req.user.removeDriver(req.body.driverId);
      res.status(200).json({ drivers });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/rostered", async (req, res) => {
    try {
      const drivers = await req.user.populate("drivers").execPopulate();
      res.status(200).json({ drivers });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/active", async (req, res) => {
    try {
      const drivers = await Driver.find({ status: "ACTIVE" });
      res.status(200).json({ drivers });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/all", async (req, res) => {
    try {
      const drivers = await Driver.find();
      res.status(200).json({ drivers });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/toggleStatus", async (req, res) => {
    try {
      const status = await req.user.toggleStatus(req.body.status);
      if (status.error) {
        logError(status.error, req, status.functionName);
        return res.status(500).json({ error: status.error });
      }
      res.status(200).json({ status });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
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
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/addDeviceToken", async (req, res) => {
    try {
      const driver = req.user;
      const { deviceToken } = req.body;
      const addDeviceTokenResponse = await driver.addDeviceToken(deviceToken);
      if (addDeviceTokenResponse.error) {
        const { error, functionName } = addDeviceTokenResponse;
        logError(error, req, functionName);
        return res.status(500).json({ error });
      }
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/sendMessage", async (req, res) => {
    try {
      const { driverId, title, body } = req.body;
      const { user, userModel } = req;
      const driver = await Driver.findById(driverId);
      const message = new Message({
        recipient: driverId,
        recipientModel: "Driver",
        sender: user._id,
        senderModel: userModel,
        title,
        body,
      });
      const { successCount, results, multicastId } = await sendPushNotification(
        driver.deviceTokens,
        title,
        body
      );
      message.successCount = successCount;
      message.results = results;
      message.multicastId = multicastId;
      await message.save();
      res.status(200).json(message);
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  });

module.exports = router;
