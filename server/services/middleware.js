const { validateToken } = require("./authentication");
const logError = require("./errorLog");
const ActivityLog = require("../models/activityLog");

const jwtMiddleware = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer" &&
      req.headers.authorization.split(" ")[1]
    ) {
      req.user = await validateToken(
        req.headers.authorization.split(" ")[1],
        req,
        res
      );
    } else {
      const token = req.query.token || req.body.token;
      if (token) req.user = await validateToken(token, req, res);
    }
    if (req.user && req.user.error) {
      return res.status(401).json({ errorMessage: "Unauthorized" });
    }
    next();
  } catch (error) {
    return await logError(
      { ...error, functionName: "jwtMiddleware" },
      req,
      res
    );
  }
};

const logActivity = async (req, res, next) => {
  try {
    let userId;
    const { user, body, hostname, path, method } = req;
    if (user) {
      user.lastVisited = new Date();
      await user.save();
      userId = user._id;
    }
    const newActivity = new ActivityLog({
      body,
      hostname,
      userId,
      path,
      method,
    });
    await newActivity.save();
    next();
  } catch (error) {
    return await logError({ ...error, functionName: "logActivity" }, req, res);
  }
};

module.exports = {
  jwtMiddleware,
  logActivity,
};
