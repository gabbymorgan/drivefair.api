const chai = require("chai");
const mongoose = require("mongoose");
const chaiHttp = require("chai-http");
const app = require("../app");
const dummyData = require("./dummyData.json");

chai.use(chaiHttp);
const { expect } = chai;

before(async () => {
  await mongoose.connect(
    "mongodb+srv://" +
      process.env.DB_USER +
      ":" +
      process.env.DB_PASS +
      "@cluster0-h73bz.mongodb.net/" +
      process.env.DB_CLUSTER +
      "?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
  await mongoose.connection.db.dropCollection("vendors");
  await mongoose.connection.db.dropCollection("customers");
});

after(() => {});

describe("Load dummy data", function () {
  it("Adds vendors", async function () {
    const requests = dummyData.vendors.map(async (vendor) => {
      return await chai
        .request(app)
        .post("/vendors/register")
        .type("json")
        .send(vendor);
    });
    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
    });
  });
  it("Adds customers", async function () {
    const requests = dummyData.customers.map(async (vendor) => {
      return await chai
        .request(app)
        .post("/customers/register")
        .type("json")
        .send(vendor);
    });
    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
    });
  });
  it("Adds drivers", async function () {
    const requests = dummyData.drivers.map(async (vendor) => {
      return await chai
        .request(app)
        .post("/drivers/register")
        .type("json")
        .send(vendor);
    });
    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
    });
  });
});
