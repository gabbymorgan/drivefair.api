const express = require("express");
const bcrypt = require("bcrypt");
const Customer = require("../models/customer");
const { emailTransporter } = require("../services/communications");
const logError = require("../services/errorLog");
const { signToken } = require("../services/authentication");
const emailConfirmation = require("../constants/static-pages/email-confirmation");

const router = express.Router();

router
  .post("/register", async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        address
      } = req.body;
      const newCustomer = new Customer({
        email,
        password: await bcrypt.hash(password, 10),
        firstName,
        lastName,
        phoneNumber,
        address
      });
      const savedCustomer = await newCustomer.save();
      const emailConfirmationToken = await signToken(savedCustomer, "Customer");
      res.status(200).json({ token, profile: savedCustomer, userType: "customer" });
      await emailTransporter.sendMail({
        to: email,
        subject: `Thanks for signing up, ${firstName}!`,
        html: emailConfirmation.request(
          "customers",
          firstName,
          emailConfirmationToken
        )
      });
    } catch (error) {
      await logError(error, req);
      res.status(500).send({ error });
    }
  })
  .post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const foundCustomer = await Customer.findOne({ email });
      if (!foundCustomer) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const passwordIsValid = foundCustomer.validatePassword(password);
      if (!passwordIsValid) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const token = await signToken(foundCustomer, "Customer");
      res.status(200).json({ token, profile: foundCustomer, userType: "customer" });
    } catch (error) {
      await logError(error, req);
      res.status(500).send({ error });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({message: "Unauthorized"})
      }
      user.emailIsConfirmed = true;
      await user.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (error) {
      console.log(error);
      await logError(error, req);
      res.status(500).send({ error });
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
      console.log(error);
    }
  });

module.exports = router;
