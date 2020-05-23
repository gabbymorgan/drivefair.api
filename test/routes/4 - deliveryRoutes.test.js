const chai = require("chai");
const chaiHttp = require("chai-http");

const users = require("../dummyData/users.json");
const app = require("../../app");
const Vendor = require("../../server/models/vendor");
const Order = require("../../server/models/order");
const Driver = require("../../server/models/driver");

chai.use(chaiHttp);
const { expect } = chai;

describe("Driver Request", function () {
  const vendor = users.vendors[0];
  const driver = users.drivers[0];
  let orderId;

  it("vendor fails to hail inactive driver", async function () {
    vendor.record = await Vendor.findOne({ email: vendor.email });
    driver.record = await Driver.findOne({ email: driver.email });
    orderId = vendor.record.activeOrders[0];
    const response = await chai
      .request(app)
      .post("/orders/requestDrivers")
      .type("json")
      .send({
        driverIds: [driver.record._id],
        orderId,
        token: vendor.token,
      });
    expect(
      response.body.requestDriverResponses,
      "Response has array with one driver response"
    ).to.have.lengthOf(1);
    expect(
      response.body.requestDriverResponses[0].driverId,
      "Driver response has driver Id."
    ).to.equal(driver.record._id.toString());
    expect(
      response.body.requestDriverResponses[0].success,
      "Request to driver is unsuccessful."
    ).to.be.false;
    expect(
      response.body.requestDriverResponses[0].error,
      "Request to driver has error with message."
    ).to.include.keys("message");
  });
  it("driver goes active", async function () {
    const login = await chai
      .request(app)
      .post("/drivers/login")
      .type("json")
      .send({ email: driver.email, password: driver.password });
    driver.token = login.body.token;
    const response = await chai
      .request(app)
      .post("/drivers/toggleStatus")
      .type("json")
      .send({
        status: "ACTIVE",
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("driver registers device token", async function () {
    const response = await chai
      .request(app)
      .post("/drivers/addDeviceToken")
      .type("json")
      .send({
        deviceToken: process.env.TEST_DEVICE_TOKEN,
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("active driver visible to vendor", async function () {
    const login = await chai
      .request(app)
      .post("/vendors/login")
      .type("json")
      .send({ email: vendor.email, password: vendor.password });
    vendor.token = login.body.token;
    const response = await chai
      .request(app)
      .get("/drivers/active")
      .type("json")
      .send({
        token: login.body.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
    expect(response.body.drivers, "Response has one driver").to.have.lengthOf(
      1
    );
  });
  it("vendor accepts order/requests driver", async function () {
    const response = await chai
      .request(app)
      .post("/orders/vendorAcceptOrder")
      .type("json")
      .send({
        driverId: driver.record._id,
        timeToReady: 15,
        orderId,
        token: vendor.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
    expect(
      response.body.requestDriverResponses,
      "Response has driver request responses array with one driver response"
    ).to.have.lengthOf(1);
    expect(
      response.body.requestDriverResponses[0].driverId,
      "Driver response has driver Id."
    ).to.equal(driver.record._id.toString());
    expect(
      response.body.requestDriverResponses[0].success,
      "Request to driver is successful."
    ).to.be.true;
    const order = await Order.findById(orderId);
    expect(
      order.requestedDrivers,
      "Order has one requested driver"
    ).to.have.length(1);
    expect(order.disposition, "Order is waiting for driver").to.equal(
      "WAITING_FOR_DRIVER"
    );
  });
  it("driver accepts order", async function () {
    const response = await chai
      .request(app)
      .post("/route/acceptOrder")
      .type("json")
      .send({
        orderId,
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
    const order = await Order.findById(orderId);
    expect(order.disposition, "Order is waiting for driver").to.equal(
      "ACCEPTED_BY_DRIVER"
    );
    expect(order.driver.toString(), "Driver is assigned to order").to.equal(
      driver.record._id.toString()
    );
  });
  it("driver fails to go inactive with active orders ", async function () {
    const response = await chai
      .request(app)
      .post("/drivers/toggleStatus")
      .type("json")
      .send({
        status: "INACTIVE",
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(500);
    expect(response.body, "Response has error").to.include.key("error");
  });
  it("vendor readies order", async function () {
    const response = await chai
      .request(app)
      .post("/orders/readyOrder")
      .type("json")
      .send({
        orderId,
        token: vendor.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("driver picks up order", async function () {
    const response = await chai
      .request(app)
      .post("/route/pickUpOrder")
      .type("json")
      .send({
        orderId,
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("driver delivers order", async function () {
    const response = await chai
      .request(app)
      .post("/route/deliverOrder")
      .type("json")
      .send({
        orderId,
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("driver goes inactive ", async function () {
    const response = await chai
      .request(app)
      .post("/drivers/toggleStatus")
      .type("json")
      .send({
        status: "INACTIVE",
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has error").to.not.have.key("error");
  });
  it("refunds an order", async function () {
    const response = await chai
      .request(app)
      .post("/orders/refundOrder")
      .type("json")
      .send({ token: vendor.token, orderId, password: vendor.password });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
});
