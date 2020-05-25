const express = require("express");
const bcrypt = require("bcrypt");
const Vendor = require("../models/vendor");
const Authentication = require("../services/authentication");
const EmailConfirmationPages = require("../constants/static-pages/email-confirmation");
const logError = require("../services/errorLog");

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
        logoUrl,
      } = req.body;
      const newVendor = new Vendor({
        email,
        password: await bcrypt.hash(password, 10),
        businessName,
        address,
        description,
        phoneNumber,
        logoUrl,
      });
      const savedVendor = await newVendor.save();
      const token = await Authentication.signToken(savedVendor, "Vendor");
      const emailConfirmationToken = await Authentication.signEmailToken(
        savedVendor,
        "Vendor"
      );
      await savedVendor.sendEmail({
        setting: "ACCOUNT",
        subject: `Thanks for signing up, ${businessName}!`,
        html: EmailConfirmationPages.request(
          "vendors",
          businessName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ profile: savedVendor, token });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const foundVendor = await Vendor.findOne({ email });
      if (!foundVendor) {
        return await logError(
          { message: "Incorrect username and/or password.", status: 401 },
          req,
          res
        );
      }
      const passwordIsValid = foundVendor.validatePassword(password);
      if (!passwordIsValid) {
        return await logError(
          { message: "Incorrect username and/or password.", status: 401 },
          req,
          res
        );
      }
      const token = await Authentication.signToken(foundVendor, "Vendor");
      res.status(200).json({ token, profile: foundVendor, userType: "vendor" });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/addMenuItem", async (req, res) => {
    try {
      const { name, description, imageUrl, price, modifications } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      const menuItems = await vendor.addMenuItem({
        name,
        description,
        imageUrl,
        price,
        modifications,
      });
      if (menuItems.error) {
        const { error } = menuItems;
        return await logError(error, req, res);
      }
      res.status(200).json({ menuItems });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/removeMenuItem", async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      const menuItems = await vendor.removeMenuItem(menuItemId);
      if (menuItems.error) {
        return await logError(menuItems.error, req, res);
      }
      res.status(200).json({ menuItems });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/editMenuItem", async (req, res) => {
    try {
      const { menuItemId, changes } = req.body;
      const vendor = req.user;
      if (!vendor.menu.includes(menuItemId)) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      const menuItems = await vendor.editMenuItem(menuItemId, changes);
      if (menuItems.error) {
        const { error } = menuItems;
        return await logError(error, req, res);
      }
      res.status(200).json({ menuItems });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/addModification", async (req, res) => {
    try {
      const { name, options, type, defaultOptionIndex } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      const savedModifications = await vendor.addModification({
        name,
        options,
        type,
        defaultOptionIndex,
      });
      if (savedModifications.error) {
        return await logError(savedModifications.error, req, res);
      }
      res.status(200).json({ savedModifications });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/removeModification", async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const vendor = req.user;
      if (!vendor) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      const savedModifications = await vendor.removeModification(menuItemId);
      if (savedModifications.error) {
        const { error } = savedModifications;
        return await logError(error, req, res);
      }
      res.status(200).json({ savedModifications });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/editModification", async (req, res) => {
    try {
      const { modificationId, changes } = req.body;
      const vendor = req.user;
      const savedModifications = await vendor.editModification(
        modificationId,
        changes
      );
      if (savedModifications.error) {
        return await logError(savedModifications.error, req, res);
      }
      res.status(200).json({ savedModifications });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/confirmEmail", async (req, res) => {
    try {
      const isEmailToken = await Authentication.validateEmailToken(
        req.query.token
      );
      if (!req.user || !isEmailToken) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          res,
          res
        );
      }
      req.user.emailIsConfirmed = true;
      await req.user.save();
      res.status(200).send(EmailConfirmationPages.confirmed());
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/me", async (req, res) => {
    try {
      const profile = req.user;
      res.status(200).json({ profile });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/menu", async (req, res) => {
    try {
      let vendor;
      const { vendorId } = req.query;
      if (vendorId) vendor = await Vendor.findById(vendorId);
      else vendor = req.user;
      const foundMenu = await vendor.getMenu();
      if (foundMenu.error) {
        return await logError(foundMenu.error, req, foundMenu.res);
      }
      res.status(200).json({ foundMenu });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const foundVendor = await Vendor.findById(vendorId).select("-password");
      if (foundVendor.error) {
        return await logError(foundVendor.error, req, foundVendor.res);
      }
      res.status(200).json({ foundVendor });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/editVendor", async (req, res) => {
    const vendor = req.user;
    try {
      const passwordIsValid = await vendor.validatePassword(req.body.password);
      if (!passwordIsValid) {
        const error = { message: "Unauthorized.", status: 401 };
        return await logError(error, req, res);
      }
      const savedVendor = await vendor.editVendor(req.body);
      if (savedVendor.error) {
        return await logError(savedVendor.error, req, savedVendor.res);
      }
      res.status(200).json({ savedVendor });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .get("/", async (req, res) => {
    try {
      const vendors = await Vendor.find({ emailIsConfirmed: true }).select(
        "-password"
      );
      res.status(200).json({ vendors });
    } catch (error) {
      return await logError(error, req, res);
    }
  })
  .post("/sendConfirmationEmail", async (req, res) => {
    try {
      const vendor = req.user;
      const emailConfirmationToken = await Authentication.signEmailToken(
        vendor,
        "Vendor"
      );
      await vendor.sendEmail({
        setting: "ACCOUNT",
        subject: `Thanks for signing up, ${vendor.businessName}!`,
        html: EmailConfirmationPages.request(
          "vendors",
          vendor.businessName,
          emailConfirmationToken
        ),
      });
      res.status(200).json({ success: true });
    } catch (error) {
      return await logError(error, req, res);
    }
  });

module.exports = router;
