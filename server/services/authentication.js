const jwt = require("jsonwebtoken");
const moment = require("moment");

const { JWT_EXPIRY_INTERVAL, JWT_SECRET_KEY } = process.env;

const validateToken = async (token, db) => {
  try {
    const { sub } = jwt.verify(token, JWT_SECRET_KEY);
    const foundUser = await db.findById(sub);
    return foundUser;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const signToken = async user => {
  const payload = {
    sub: user._id,
    exp: Math.floor(Date.now() / 1000) + parseInt(JWT_EXPIRY_INTERVAL)
  };
  return jwt.sign(payload, JWT_SECRET_KEY);
};

module.exports = {
  validateToken,
  signToken
};
