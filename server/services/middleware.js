const { validateToken } = require("./authentication");

const jwtMiddleware = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      req.user = await validateToken(req.headers.authorization.split(" ")[1]);
    } else {
      const token = req.query.token || req.body.token;
      if (token) req.user = await validateToken(token);
    }
    next();
  } catch (error) {
    console.log(error);
    next();
  }
};

module.exports = {
  jwtMiddleware
};
