const chai = require("chai");
const mongoose = require("mongoose");
const chaiHttp = require("chai-http");

const app = require("../../app");
const users = require("../dummyData/singleUser.json");
const menuItems = require("../dummyData/menuItems.json");
const Vendor = require("../../server/models/vendor");

chai.use(chaiHttp);
const { expect } = chai;

describe("Menu Items", function () {
  it("adds menu items", async function () {
    const requests = users.vendors.map(async (vendor) => {
      const { email, password } = vendor;
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const login = await chai
        .request(app)
        .post("/vendors/login")
        .type("json")
        .send({ email, password });
      const response = await chai
        .request(app)
        .post("/vendors/addMenuItem")
        .type("json")
        .send({ ...menuItem, token: login.body.token });
      expect(response, "Response is status 200").to.have.status(200);
    });
    await Promise.all(requests);
  });
});
