const jwtMiddleware = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      req.user = await validateToken(req.headers.authorization.split(" ")[1]);
    }
    next();
  } catch (err) {
    console.log(err);
    next();
  }
};

module.exports = {
  jwtMiddleware
}