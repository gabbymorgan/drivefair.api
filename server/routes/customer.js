const express = require("express");
const bcrypt = require("bcrypt");
const Customer = require("../models/customer");
const Communications = require("../services/communications");
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
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        address,
      } = req.body;
      const newCustomer = new Customer({
        email,
        password: await bcrypt.hash(password, 10),
        firstName,
        lastName,
        phoneNumber,
        address,
      });
      const savedCustomer = await newCustomer.save();
      const token = await signToken(savedCustomer, "Customer");
      const emailConfirmationToken = await signEmailToken(
        savedCustomer,
        "Customer"
      );
      await savedCustomer.sendEmail({
        subject: `Thanks for signing up, ${firstName}!`,
        html: emailConfirmation.request(
          "customers",
          firstName,
          emailConfirmationToken
        ),
      });
      res
        .status(200)
        .json({ token, profile: savedCustomer, userType: "customer" });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const foundCustomer = await Customer.findOne({ email });
      if (!foundCustomer) {
        return await logError(
          {
            message: "Wrong email/password combination.",
            status: 401,
          },
          req,
          res
        );
      }
      const passwordIsValid = foundCustomer.validatePassword(password);
      if (!passwordIsValid) {
        return await logError(
          {
            message: "Wrong email/password combination.",
            status: 401,
          },
          req,
          res
        );
      }
      const token = await signToken(foundCustomer, "Customer");
      res
        .status(200)
        .json({ token, profile: foundCustomer, userType: "customer" });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const isEmailToken = await validateEmailToken(req.query.token);
      if (!req.user || !isEmailToken) {
        logError({ message: "Unauthorized", status: 401 });
      }
      req.user.emailIsConfirmed = true;
      await req.user.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      if (!profile) {
        return await logError(
          { message: "Unauthorized", status: 401 },
          null,
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
      const customer = req.user;
      const emailConfirmationToken = await signEmailToken(customer, "Customer");
      await customer.sendEmail({
        to: customer.email,
        from: process.env.EMAIL_USER,
        subject: `Thanks for signing up, ${customer.firstName}!`,
        html: emailConfirmation.request(
          "customers",
          customer.firstName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ success: true });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/addAddress", async (req, res) => {
    try {
      const addresses = await req.user.addAddress(req.body.address);
      if (addresses.error) {
        const { error } = addresses;
        return await logError(error, req, res);
      }
      res.status(200).json({ addresses });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/editAddress", async (req, res) => {
    try {
      const { addressId, changes } = req.body;
      const addresses = await req.user.editAddress(addressId, changes);
      if (addresses.error) {
        const { error } = addresses;
        return await logError(error, req, res);
      }
      res.status(200).json({ addresses });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/selectAddress", async (req, res) => {
    try {
      const { addressId } = req.body;
      const selectedAddress = await req.user.selectAddress(addressId);
      if (selectedAddress.error) {
        const { error } = selectedAddress;
        return await logError(error, req, res);
      }
      res.status(200).json({ selectedAddress });
    } catch (error) {
      return await logError(error, req);
    }
  })
  .post("/deleteAddress", async (req, res) => {
    try {
      const { addressId } = req.body;
      const addresses = await req.user.deleteAddress(addressId);
      if (addresses.error) {
        const { error } = addresses;
        return await logError(error, req, res);
      }
      res.status(200).json({ addresses });
    } catch (error) {
      return await logError(error, req);
    }
  })
  .get("/addresses", async (req, res) => {
    try {
      const { addresses } = await req.user.populate("addresses").execPopulate();
      res.status(200).json({ addresses });
    } catch (error) {
      return await logError(error, req);
    }
  });

module.exports = router;
