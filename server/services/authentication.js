const jwt = require("jsonwebtoken");
const { logError } = require("./errorLog");
const Vendor = require("../models/vendor");
const Customer = require("../models/customer");

const models = {
  Vendor,
  Customer,
};

const { JWT_EXPIRY_INTERVAL, JWT_SECRET_KEY } = process.env;

const validateToken = async (token) => {
  try {
    const { data } = jwt.verify(token, JWT_SECRET_KEY);
    const { email, userType } = data;
    const foundUser = await models[userType].findOne({ email });
    return foundUser;
  } catch (error) {
    return { error };
  }
};

const validateEmailToken = async (token) => {
  try {
    const { data } = jwt.verify(token, JWT_SECRET_KEY);
    const { isEmailToken } = data;
    return isEmailToken;
  } catch (error) {
    logError(error, req, "validateEmailToken");
  }
};

const signToken = async (user, userType) => {
  const payload = {
    data: {
      email: user.email,
      userType,
    },
    exp: Math.floor(Date.now() / 1000) + parseInt(JWT_EXPIRY_INTERVAL),
  };
  return jwt.sign(payload, JWT_SECRET_KEY);
};

const signEmailToken = async (user, userType) => {
  const payload = {
    data: {
      email: user.email,
      userType,
      isEmailToken: true,
    },
  };
  return jwt.sign(payload, JWT_SECRET_KEY);
};

module.exports = {
  validateToken,
  signToken,
  signEmailToken,
  validateEmailToken,
};
