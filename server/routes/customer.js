const express = require("express");
const Customer = require("../models/customer");
const { emailTransporter } = require("../services/communications");
const {
  signToken,
  signEmailToken,
  validateToken
} = require("../services/authentication");
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
      const emailConfirmationToken = await signEmailToken(savedCustomer);
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
      const token = await signToken(foundCustomer);
      res.status(200).json({ token });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { token } = req.query;
      const validUser = await validateToken(token, Customer);
      validUser.emailIsConfirmed = true;
      await validUser.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .post("/me", async (req, res) => {
    try {
      const { token } = req.body;
      const validCustomer = await validateToken(token, Customer);
      if (!validCustomer)
        return res.status(401).json({ message: "Unauthorized" });
      res.status(200).json(validCustomer);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  });

module.exports = router;
