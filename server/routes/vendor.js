const express = require("express");
const bcrypt = require("bcrypt");
const Vendor = require("../models/vendor");
const { emailTransporter } = require("../services/communications");
const { signToken } = require("../services/authentication");
const logError = require("../services/errorLog");
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
        phoneNumber,
      } = req.body;
      const newVendor = new Vendor({
        email,
        password: await bcrypt.hash(password, 10),
        businessName,
        address,
        description,
        phoneNumber,
      });
      const savedVendor = await newVendor.save();
      const emailConfirmationToken = await signToken(savedVendor, "Vendor");
      res.status(200).json({ token, profile: savedVendor, userType: "vendor" });
      await emailTransporter.sendMail({
        to: email,
        subject: `Thanks for signing up, ${businessName}!`,
        html: emailConfirmation.request(
          "vendors",
          businessName,
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
      res.status(200).json({ token, profile: foundVendor, userType: "vendor" });
    } catch (error) {
      await logError(error, req, this.name);
      res.status(500).send({ error });
    }
  })
  .post("/addMenuItem", async (req, res) => {
    try {
      const { name, description, imageUrl, price, modifications } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const menuItems = await vendor.addMenuItem({
        name,
        description,
        imageUrl,
        price,
        modifications,
      });
      res.status(200).json({ menuItems });
    } catch (error) {
      console.log({ error });
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/removeMenuItem", async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const menuItems = await vendor.removeMenuItem(menuItemId);
      res.status(200).json({ menuItems });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/editMenuItem", async (req, res) => {
    try {
      const { menuItemId, changes } = req.body;
      const vendor = req.user;
      const menuItem = vendor.menu.find((a) => a._id.toString() === menuItemId);
      if (!menuItem) {
        return res.status(401).json({ message: "Unauthorized." });
      }
      const menuItems = await vendor.editMenuItem(menuItem, changes);
      res.status(200).json({ menuItems });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/addModification", async (req, res) => {
    try {
      const { name, options, type, defaultOption } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const savedModifications = await vendor.addModification({
        name,
        options,
        type,
        defaultOption,
      });
      res.status(200).json({ savedModifications });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/removeModification", async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const savedModifications = await vendor.removeModification(menuItemId);
      res.status(200).json({ savedModifications });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/editModification", async (req, res) => {
    try {
      const { menuItemId, changes } = req.body;
      const vendor = req.user;
      const menuItem = vendor.menu.find((a) => a._id.toString() === menuItemId);
      if (!menuItem) {
        return res.status(401).json({ message: "Unauthorized." });
      }
      const savedModifications = await vendor.editModification(
        menuItem,
        changes
      );
      res.status(200).json({ savedModifications });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      user.emailIsConfirmed = true;
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
      res.status(200).json({ profile });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/menu", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized." });
      }
      const { menuItems, modifications } = await req.user.getMenu();
      res.status(200).json({ menuItems, modifications });
    } catch (error) {
      res.status(500).json({ error });
    }
  })
  .get("/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const foundVendor = await Vendor.findById(vendorId).select("-password");
      res.status(200).json(foundVendor);
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/editVendor", async (req, res) => {
    const vendor = req.user;
    try {
      const passwordIsValid = await vendor.validatePassword(req.body.password);
      if (!passwordIsValid) {
        const error = { message: "Unauthorized." };
        logError(error, req);
        return res.status(401).json({ error });
      }
      const savedVendor = await vendor.editVendor(req.body);
      res.status(200).json({ savedVendor });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  })
  .get("/", async (req, res) => {
    // refactor before first dozen vendors
    try {
      const vendors = await Vendor.find().select("-password");
      res.status(200).json({ vendors });
    } catch (error) {
      await logError(error, req);
      res.status(500).json({ error });
    }
  });

module.exports = router;
