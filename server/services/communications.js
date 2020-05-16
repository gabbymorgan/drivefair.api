const nodemailer = require("nodemailer");

const emailTransporter = nodemailer.createTransport({
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

emailTransporter.sendMail =
  process.env.NODE_ENV === "PRODUCTION"
    ? emailTransporter.sendMail
    : async () => true;

module.exports = {
  emailTransporter,
};
