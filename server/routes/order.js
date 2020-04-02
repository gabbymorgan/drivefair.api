const express = require("express");
const Customer = require("../models/customer");
const { emailTransporter } = require("../services/communications");
const { signToken, validateToken } = require("../services/authentication");
const emailConfirmation = require("../constants/static-pages/email-confirmation");

const router = express.Router();

router
  .post("/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const newCustomer = new Customer({
        email,
        password,
        firstName,
        lastName
      });
      const savedCustomer = await newCustomer.save();
      const emailConfirmationToken = await signToken(savedCustomer);
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
    const { email, password } = req.body;
    const foundCustomer = await Customer.findOne({ email });
    if (!foundcustomer) {
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
    const token = signToken(foundCustomer);
    res.status(200).json({ token });
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
  });

module.exports = router;
