const chai = require("chai");
const chaiHttp = require("chai-http");

const users = require("../dummyData/users.json");
const app = require("../../app");
const Vendor = require("../../server/models/vendor");
const Driver = require("../../server/models/driver");

chai.use(chaiHttp);
const { expect } = chai;

describe("Driver Request", function () {
  const vendor = users.vendors[0];
  const driver = users.drivers[0];
  it("driver goes active", async function () {
    vendor.record = await Vendor.findOne({ email: vendor.email });
    driver.record = await Driver.findOne({ email: driver.email });
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
        selectedDriverId: driver.record._id,
        timeToReady: 15,
        orderId: vendor.record.activeOrders[0]._id,
        token: vendor.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  it("driver accepts order", async function () {
    const response = await chai
      .request(app)
      .post("/route/acceptOrder")
      .type("json")
      .send({
        orderId: vendor.record.activeOrders[0]._id,
        token: driver.token,
      });
    expect(response, "Response is status 200").to.have.status(200);
    expect(response.body, "Response has no error").to.not.have.key("error");
  });
  // it("driver fails to go inactive with active orders ", async function () {});
  // it("driver goes inactive ", async function () {});
  // it("vendor fails to request inactive driver ", async function () {});
});
