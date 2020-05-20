const ErrorLog = require("../models/errorLog");

const logError = async (err, req, res) => {
  try {
    let { message, functionName } = err;
    // For mongoose validation errors, just return first error
    // Not worth building a list-based error model when we could
    // devote that energy to front-end input validation
    if (err.name === "ValidationError") {
      message = err.errors[Object.keys(err.errors)[0]].message;
    }
    console.log(err);
    const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
    const { body, path, baseUrl, hostname, user } = req;
    const newErrorLog = new ErrorLog({
      error: errorString,
      body,
      user,
      hostname,
      path: baseUrl + path,
      functionName,
    });
    await newErrorLog.save();
    if (!message) {
      message = "Something went wrong. Please try again later.";
    }
    return res
      .status(err.status || 500)
      .json({ success: false, error: { message } });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went really wrong. We're working on it." });
  }
};

module.exports = logError;
