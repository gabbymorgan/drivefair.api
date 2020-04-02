const express = require("express");
const bcrypt = require("bcrypt");
const Vendor = require("../models/vendor");
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
        businessName,
        address,
        description,
        phoneNumber
      } = req.body;
      const newVendor = new Vendor({
        email,
        password: await bcrypt.hash(password, 10),
        businessName,
        address,
        description,
        phoneNumber
      });
      const savedVendor = await newVendor.save();
      const emailConfirmationToken = await signEmailToken(savedVendor);
      res.status(200).json({ savedVendor });
      await emailTransporter.sendMail({
        to: email,
        subject: `Thanks for signing up, ${businessName}!`,
        html: emailConfirmation.request(
          "vendors",
          businessName,
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
      const foundVendor = await Vendor.findOne({ email });
      if (!foundVendor) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const passwordIsValid = foundVendor.validatePassword(password);
      if (!passwordIsValid) {
        return res
          .status(401)
          .json({ message: "Incorrect username and/or password." });
      }
      const token = await signToken(foundVendor);
      res.status(200).json({ token });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .post("/addMenuItem", async (req, res) => {
    try {
      const { token, name, description, price } = req.body;
      const validVendor = await validateToken(token, Vendor);
      if (!validVendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await validVendor.addMenuItem({ name, description, price });
      res.status(200).json(validVendor);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .post("/removeMenuItem", async (req, res) => {
    try {
      const { token, menuItemId } = req.body;
      const validVendor = await validateToken(token, Vendor);
      if (!validVendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await validVendor.removeMenuItem(menuItemId);
      res.status(200).json(validVendor);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { token } = req.query;
      const validVendor = await validateToken(token, Vendor);
      validVendor.emailIsConfirmed = true;
      await validVendor.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .get("/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const foundVendor = await Vendor.findById(vendorId);
      res.status(200).json(foundVendor);
    } catch (err) {
      console.log(err);
      res.status(500).json({ err });
    }
  })
  .get("/", async (req, res) => {
    // refactor before first dozen vendors
    try {
      const vendors = await Vendor.find();
      res.status(200).json({ vendors });
    } catch (err) {
      console.log(err);
    }
  });

module.exports = router;
