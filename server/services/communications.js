const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  host: process.env.EMAIL_HOST,
  secureConnection: false,
  port: 465,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  tls: {
    ciphers: process.env.EMAIL_CIPHERS.split(","),
  },
});

emailTransporter.sendMail =
  process.env.NODE_ENV === "production"
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
