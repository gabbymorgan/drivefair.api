const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

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
    ciphers: process.env.EMAIL_CIPHERS,
  },
});

const sendMail = async ({ to, subject, text, html }) => {
  return process.env.NODE_ENV === "production"
    ? await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html,
      })
    : true;
};

const sendPushNotification = async ({ deviceTokens, title, body, data }) => {
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
  sendMail,
  sendPushNotification,
};
