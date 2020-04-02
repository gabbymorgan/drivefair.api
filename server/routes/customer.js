const express = require("express");
const moment = require("moment");
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
        html: emailConfirmation("customers", firstName, emailConfirmationToken)
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({ err });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { token } = req.query;
      const validUser = await validateToken(token, Customer);
      validUser.emailIsConfirmed = true;
      await validUser.save();
      res
        .status(200)
        .send( //move to separate file
          `<div style="height:100vh;display:flex;justify-content:center;align-items:center;text-align:center"><p style="font-size:2rem">Good jorb!</p></div>`
        );
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  });

module.exports = router;
