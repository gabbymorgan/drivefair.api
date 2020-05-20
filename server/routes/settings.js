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
      return await logError(error, req, res);
    }
  })
  .post("/newSetting", async (req, res) => {
    try {
      const { name, value, password } = req.body;
      const { user } = req;
      if (!user || password !== process.env.APP_SETTINGS_PASSWORD) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          req,
          res
        );
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
      return await logError(error, req, res);
    }
  })
  .post("/updateSetting", async (req, res) => {
    try {
      const { settingId, name, value, password } = req.body;
      const { user } = req;
      if (!user || password !== process.env.APP_SETTINGS_PASSWORD) {
        return await logError(
          { message: "Unauthorized.", status: 401 },
          req,
          res
        );
      }
      const setting = await AppSetting.findById(settingId);
      const savedSetting = await setting.updateSetting(name, value, user._id);
      res.status(200).json({ savedSetting });
    } catch (error) {
      return await logError(error, req, res);
    }
  });

module.exports = router;
