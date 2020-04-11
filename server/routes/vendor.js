const express = require("express");
const bcrypt = require("bcrypt");
const Vendor = require("../models/vendor");
const { emailTransporter } = require("../services/communications");
const {
  signToken,
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
      const emailConfirmationToken = await signToken(savedVendor, "Vendor");
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
    } catch (error) {
      console.log(error);
      res.status(500).send({ error });
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
      const token = await signToken(foundVendor, "Vendor");
      res.status(200).json({ token });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  })
  .post("/addMenuItem", async (req, res) => {
    try {
      const { name, description, price, modifications } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await req.user.addMenuItem({ name, description, price, modifications });
      res.status(200).json(req.user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  })
  .post("/removeMenuItem", async (req, res) => {
    try {
      const { menuItemId } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await req.user.removeMenuItem(menuItemId);
      res.status(200).json(req.user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      req.user.emailIsConfirmed = true;
      await req.user.save();
      res.status(200).send(emailConfirmation.confirmed());
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      res.status(200).json({profile});
    } catch (error) {
      console.log(error);
    }
  })
  .get("/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const foundVendor = await Vendor.findById(vendorId);
      res.status(200).json(foundVendor);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  })
  .get("/", async (req, res) => {
    // refactor before first dozen vendors
    try {
      const vendors = await Vendor.find();
      res.status(200).json({ vendors });
    } catch (error) {
      console.log(error);
    }
  })

module.exports = router;
