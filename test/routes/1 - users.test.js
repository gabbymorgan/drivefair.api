const chai = require("chai");
const mongoose = require("mongoose");
const chaiHttp = require("chai-http");

const app = require("../../app");
const users = require("../dummyData/users.json");
const Vendor = require("../../server/models/vendor");
const Customer = require("../../server/models/customer");
const Driver = require("../../server/models/driver");

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
  await mongoose.connection.db.dropCollection("drivers");
});

after(() => {
  mongoose.connection.close();
});

const models = {
  vendors: Vendor,
  customers: Customer,
  drivers: Driver,
};

const confirmEmail = async (collection, id) => {
  const profile = await models[collection].findById(id);
  profile.emailIsConfirmed = true;
  await profile.save();
  return profile;
};

const combineAddress = (userData) => {
  return {
    street: userData.street,
    unit: userData.unit,
    city: userData.city,
    state: userData.state,
    zip: userData.zip,
  };
};

describe("Loads dummy users", function () {
  it("Adds vendors", async function () {
    const requests = users.vendors.map(async (vendor) => {
      const address = combineAddress(vendor);
      const response = await chai
        .request(app)
        .post("/vendors/register")
        .type("json")
        .send({ ...vendor, address });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
      const profile = await confirmEmail("vendors", response.body.profile._id);
      expect(profile.emailIsConfirmed).to.be.true;
    });
    await Promise.all(requests);
  });
  it("Adds customers", async function () {
    const requests = users.customers.map(async (customer) => {
      const address = combineAddress(customer);
      const response = await chai
        .request(app)
        .post("/customers/register")
        .type("json")
        .send({ ...customer, address });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
      const profile = await confirmEmail(
        "customers",
        response.body.profile._id
      );
      expect(profile.emailIsConfirmed).to.be.true;
    });
    await Promise.all(requests);
  });
  it("Adds drivers", async function () {
    const requests = users.drivers.map(async (driver) => {
      const address = combineAddress(driver);
      const response = await chai
        .request(app)
        .post("/drivers/register")
        .type("json")
        .send({ ...driver, address });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body.token, "Response has token").to.be.string;
      expect(response.body.profile, "Response has profile").to.have.keys;
      const profile = await confirmEmail("drivers", response.body.profile._id);
      expect(profile.emailIsConfirmed).to.be.true;
    });
    await Promise.all(requests);
  });
});
