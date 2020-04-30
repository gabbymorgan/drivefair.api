const ErrorLog = require("../models/errorLog");

const logError = async (err, req, functionName) => {
  console.log(err)
  const errorString = JSON.stringify(err);
  const { body, path, baseUrl, hostname, user } = req;
  const newErrorLog = new ErrorLog({
    error: errorString,
    body,
    user,
    hostname,
    path: baseUrl + path,
    functionName
  });
  await newErrorLog.save();
};

module.exports = logError;
