const chai = require("chai");
const mongoose = require("mongoose");
const chaiHttp = require("chai-http");

const app = require("../../app");
const users = require("../dummyData/users.json");
const Vendor = require("../../server/models/vendor");
const MenuItem = require("../../server/models/menuItem");

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
});

after(() => {
  mongoose.connection.close();
});

describe("Build a cart and checkout", function () {
  it("Adds orders to cart", async function () {
    const requests = users.customers.map(async (customer) => {
      const vendors = await Vendor.find();
      const vendor = vendors[0];
      const menuItem = await MenuItem.findById(vendor.menu[0]);
      const { email, password } = customer;
      const login = await chai
        .request(app)
        .post("/customers/login")
        .type("json")
        .send({ email, password });
      customer.token = login.body.token;
      const response = await chai
        .request(app)
        .post("/orders/addToCart")
        .type("json")
        .send({
          menuItemId: menuItem._id,
          modifications: [],
          vendorId: vendor._id,
          token: login.body.token,
        });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body, "To have no error").to.not.have.key("error");
    });
    await Promise.all(requests);
    await Promise.all(requests);
  });
  it("Removes an order from cart", async function () {
    const requests = users.customers.map(async (customer) => {
      const getCartResponse = await chai
        .request(app)
        .get("/orders/cart")
        .type("json")
        .send({ token: customer.token });
      expect(getCartResponse, "Response is status 200").to.have.status(200);
      expect(getCartResponse.body, "Response has no error").to.not.have.key(
        "error"
      );
      expect(getCartResponse.body.savedCart, "Response returns cart").to.exist;
      const { savedCart } = getCartResponse.body;
      expect(savedCart.orderItems, "Response returns cart").to.be.an("array");
      const removeOrderResponse = await chai
        .request(app)
        .post("/orders/removeFromCart")
        .type("json")
        .send({
          orderItemId: savedCart.orderItems[0]._id,
          token: customer.token
        });
      expect(removeOrderResponse, "Response is status 200").to.have.status(200);
      expect(removeOrderResponse, "To have no error").to.not.have.key("error");
    });
    await Promise.all(requests);
  });
});
