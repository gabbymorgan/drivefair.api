const nodemailer = require("nodemailer");

var emailTransporter = nodemailer.createTransport({
  service: "Godaddy",
  host: "smtpout.secureserver.net",
  secureConnection: false,
  port: 465,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  tls: {
    ciphers: "SSLv3",
  },
});

module.exports = {
  emailTransporter,
};
