const express = require("express");
const AppSetting = require("../models/appSettings");
const logError = require("../services/errorLog");

const router = express.Router();

router
  .get("/allSettings", async (req, res) => {
    try {
      const settings = await AppSetting.find();
      res.status(200).json({ settings });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/newSetting", async (req, res) => {
    try {
      const { name, value, password } = req.body;
      const { user } = req;
      if (!user || password !== process.env.APP_SETTINGS_PASSWORD) {
        return res.status(401).json({ messgae: "Unauthorized." });
      }
      const newSetting = new AppSetting({
        name,
        value,
        user,
        createdBy: user._id,
      });
      const savedSetting = await newSetting.save();
      res.status(200).json({ savedSetting });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  })
  .post("/updateSetting", async (req, res) => {
    try {
      const { settingId, name, value, password } = req.body;
      const { user } = req;
      if (!user || password !== process.env.APP_SETTINGS_PASSWORD) {
        return res.status(401).json({ messgae: "Unauthorized." });
      }
      const setting = await AppSetting.findById(settingId);
      const savedSetting = await setting.updateSetting(name, value, user._id);
      res.status(200).json({ savedSetting });
    } catch (error) {
      logError(error, req);
      res.status(500).json({ error });
    }
  });

module.exports = router;
