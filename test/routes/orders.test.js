const chai = require("chai");
const mongoose = require("mongoose");
const Payment = require("../../server/services/payment");
const chaiHttp = require("chai-http");

const app = require("../../app");
const users = require("../dummyData/singleUser.json");
const Vendor = require("../../server/models/vendor");
const MenuItem = require("../../server/models/menuItem");

chai.use(chaiHttp);
const { expect } = chai;

module.exports = function suite() {
  let expectedOrderItemsLength = 0;
  it("adds orders to cart", async function () {
    const requests = () => {
      expectedOrderItemsLength++;
      return users.customers.map(async (customer, index) => {
        const vendors = await Vendor.find();
        const vendor = vendors[index];
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
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("savedCart");
        expect(response.body.savedCart.orderItems).to.have.lengthOf(
          expectedOrderItemsLength
        );
        customer.orderItems = response.body.savedCart.orderItems;
      });
    };
    await Promise.all(requests());
    await Promise.all(requests());
    await Promise.all(requests());
  });
  it("removes an item from cart", async () => {
    const requests = () => {
      expectedOrderItemsLength--;
      return users.customers.map(async (customer) => {
        const response = await chai
          .request(app)
          .post("/orders/removeFromCart")
          .type("json")
          .send({
            token: customer.token,
            orderItemId: customer.orderItems[0]._id,
          });
        expect(response, "Response is status 200").to.have.status(200);
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("savedCart");
        expect(response.body.savedCart.orderItems).to.have.lengthOf(
          expectedOrderItemsLength
        );
        customer.orderItems = response.body.savedCart.orderItems;
      });
    };
    await Promise.all(requests());
  });
  it("charges cart to card", async function () {
    const requests = users.customers.map(async (customer) => {
      const token = await Payment.createTestPaymentToken();
      const response = await chai
        .request(app)
        .post("/orders/pay")
        .type("json")
        .send({ token: customer.token, paymentDetails: { token } });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body, "Response has no error").to.not.have.key("error");
    });
    await Promise.all(requests);
  });
  it("ready and sell pickup orders", async function () {
    const requests = users.vendors.map(async (vendor) => {
      const { email, password } = vendor;
      const login = await chai
        .request(app)
        .post("/vendors/login")
        .type("json")
        .send({ email, password });
      vendor.token = login.body.token;
      const orderRequests = login.body.profile.activeOrders.map(
        async (orderId) => {
          const readyResponse = await chai
            .request(app)
            .post("/orders/readyOrder")
            .type("json")
            .send({
              orderId,
              token: vendor.token,
            });
          expect(readyResponse, "Response is status 200").to.have.status(200);
          expect(readyResponse.body, "Response has no error").to.not.have.key(
            "error"
          );
          const pickUpResponse = await chai
            .request(app)
            .post("/orders/customerPickUpOrder")
            .type("json")
            .send({
              orderId,
              token: vendor.token,
            });
          expect(pickUpResponse, "Response is status 200").to.have.status(200);
          expect(pickUpResponse.body, "Response has no error").to.not.have.key(
            "error"
          );
        }
      );
      await Promise.all(orderRequests);
    });
    await Promise.all(requests);
  });
  const address = {
    street: "1234 Fake St",
    unit: "10",
    city: "Dallas",
    state: "TX",
    zip: "76201",
  };
  it("adds orders to cart", async function () {
    expectedOrderItemsLength = 0;
    const requests = () => {
      expectedOrderItemsLength++;
      return users.customers.map(async (customer, index) => {
        const vendors = await Vendor.find();
        const vendor = vendors[index];
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
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("savedCart");
        expect(response.body.savedCart.orderItems).to.have.lengthOf(
          expectedOrderItemsLength
        );
        customer.orderItems = response.body.savedCart.orderItems;
      });
    };
    await Promise.all(requests());
    await Promise.all(requests());
    await Promise.all(requests());
  });
  it("changes order type to delivery", async () => {
    const requests = () => {
      return users.customers.map(async (customer) => {
        const response = await chai
          .request(app)
          .post("/orders/customerSetOrderMethod")
          .type("json")
          .send({
            token: customer.token,
            orderMethod: "DELIVERY",
          });
        expect(response, "Response is status 200").to.have.status(200);
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("savedCart");
        expect(response.body.savedCart.orderItems).to.have.lengthOf(
          expectedOrderItemsLength
        );
        customer.orderItems = response.body.savedCart.orderItems;
      });
    };
    await Promise.all(requests());
  });
  it("creates address for customer", async () => {
    const requests = () => {
      expectedAddressesLength = 1;
      return users.customers.map(async (customer) => {
        const response = await chai
          .request(app)
          .post("/customers/addAddress")
          .type("json")
          .send({
            token: customer.token,
            orderMethod: "DELIVERY",
            address,
          });
        expect(response, "Response is status 200").to.have.status(200);
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("addresses");
        expect(response.body.addresses).to.have.lengthOf(
          expectedAddressesLength
        );
        customer.addresses = response.body.addresses;
      });
    };
    await Promise.all(requests());
  });
  it("selects address for order", async () => {
    const requests = () => {
      return users.customers.map(async (customer) => {
        const response = await chai
          .request(app)
          .post("/customers/selectAddress")
          .type("json")
          .send({
            token: customer.token,
            addressId: customer.addresses[0]._id,
          });
        expect(response, "Response is status 200").to.have.status(200);
        expect(response.body, "Response has no error").to.not.have.key("error");
        expect(response.body, "Returns cart").to.have.key("selectedAddress");
      });
    };
    await Promise.all(requests());
  });
  it("charges order to card", async function () {
    const requests = users.customers.map(async (customer) => {
      const token = await Payment.createTestPaymentToken();
      const response = await chai
        .request(app)
        .post("/orders/pay")
        .type("json")
        .send({ token: customer.token, paymentDetails: { token } });
      expect(response, "Response is status 200").to.have.status(200);
      expect(response.body, "Response has no error").to.not.have.key("error");
    });
    await Promise.all(requests);
  });
};
