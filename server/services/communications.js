const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

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

const sendPushNotification = async (deviceTokens, title, body, data) => {
  const message = await admin.messaging().sendToDevice(
    deviceTokens,
    {
      notification: { title, body },
      data,
    },
    {
      // Required for background/quit data-only messages on iOS
      contentAvailable: true,
      // Required for background/quit data-only messages on Android
      priority: "high",
    }
  );
  return message;
};

module.exports = {
  emailTransporter,
  sendPushNotification,
};
