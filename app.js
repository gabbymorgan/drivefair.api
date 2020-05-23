const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const Communications = require("./server/services/communications");
const { jwtMiddleware, logActivity } = require("./server/services/middleware");
const admin = require("firebase-admin");

const orderRouter = require("./server/routes/order");
const settingsRouter = require("./server/routes/settings");
const vendorRouter = require("./server/routes/vendor");
const customerRouter = require("./server/routes/customer");
const driverRouter = require("./server/routes/driver");
const routeRouter = require("./server/routes/deliveryRoute");

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: "delivery-2a108",
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: "https://delivery-2a108.firebaseio.com",
});

dbUrls = {
  development: "mongodb://127.0.0.1:27017/delivery",
  test: "mongodb://127.0.0.1:27017/delivery",
  production:
    "mongodb+srv://" +
    process.env.DB_USER +
    ":" +
    process.env.DB_PASS +
    "@cluster0-h73bz.mongodb.net/" +
    process.env.DB_CLUSTER +
    "?retryWrites=true&w=majority",
};

mongoose
  .connect(dbUrls[process.env.NODE_ENV], {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("~~~ connected to db ~~~");
    app.listen(process.env.PORT, () => {
      console.log(`LISTENING ON PORT ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(
  morgan("method :url :status :res[content-length] - :response-time ms", {
    skip: (req, res) => process.env.NODE_ENV === "test",
  })
);
app.use(jwtMiddleware);
app.use(logActivity);
app.use("/customers", customerRouter);
app.use("/vendors", vendorRouter);
app.use("/orders", orderRouter);
app.use("/settings", settingsRouter);
app.use("/drivers", driverRouter);
app.use("/route", routeRouter);

app.get("/", async (req, res) => {
  res.status(200).json("Hello squirrel");
  await Communications.sendMail({
    to: process.env.EMAIL_RECIPIENT,
    subject: "Direct API accesss",
    text: "Someone is hitting up your API directly",
  });
});

module.exports = app;
