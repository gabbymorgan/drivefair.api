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
      res.status(200).json({ savedCustomer });
      await emailTransporter.sendMail({
        to: email,
        subject: `Thanks for signing up, ${firstName}!`,
        html: emailConfirmation.request(
          "customers",
          firstName,
          emailConfirmationToken
        )
      });
    } catch (err) {
      console.log(err);
      logError(err);
      res.status(500).send({ err });
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
      res.status(200).json({ token });
    } catch (err) {
      logError(err, req);
      res.status(500).send({ err });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { user } = req;
      user.emailIsConfirmed = true;
      await user.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (err) {
      console.log(err);
      logError(err);
      res.status(500).send({ err });
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      res.status(200).json({ profile });
    } catch (err) {
      logError(err);
      console.log(err);
    }
  });

module.exports = router;
