const ErrorLog = require("../models/errorLog");

const logError = async (error, request) => {
  const newErrorLog = new ErrorLog({error, request});
  await newErrorLog.save();
}

module.exports = logError;