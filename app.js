const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const { emailTransporter } = require("./server/services/communications");
const { jwtMiddleware } = require("./server/services/middleware");

const orderRouter = require("./server/routes/order");
const vendorRouter = require("./server/routes/vendor");
const customerRouter = require("./server/routes/customer");

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-h73bz.mongodb.net/delivery?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log("~~~ connected to db ~~~");
  })
  .catch(err => {
    console.log(err);
  });

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(
  morgan("method :url :status :res[content-length] - :response-time ms")
);
app.use(jwtMiddleware);
app.use("/customers", customerRouter);
app.use("/vendors", vendorRouter);
app.use("/orders", orderRouter);

app.get("/", async (req, res) => {
  res.status(200).json("Hello squirrel");
  await emailTransporter.sendMail({
    to: process.env.EMAIL_RECIPIENT,
    subject: "Direct API accesss",
    text: "Someone is hitting up your API directly"
  });
});

app.listen(process.env.PORT, () => {
  console.log(`LISTENING ON PORT ${process.env.PORT}`);
});
