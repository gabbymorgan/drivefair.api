const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor");
const Customer = require("../models/customer");

const models = {
  Vendor,
  Customer
}

const { JWT_EXPIRY_INTERVAL, JWT_SECRET_KEY } = process.env;

const validateToken = async (token) => {
  try {
    const { email, userType } = jwt.verify(token, JWT_SECRET_KEY).data;
    const foundUser = await models[userType].findOne({ email });
    return foundUser;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const signToken = async (user, userType) => {
  const payload = {
    data: {
      email: user.email,
      userType
    },
    exp: Math.floor(Date.now() / 1000) + parseInt(JWT_EXPIRY_INTERVAL)
  };
  return jwt.sign(payload, JWT_SECRET_KEY);
};

module.exports = {
  validateToken,
  signToken,
};
