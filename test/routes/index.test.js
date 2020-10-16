const userTests = require("./users.test");
const menuTests = require("./menu.test");
const orderTests = require("./orders.test");
const routeTests = require("./deliveryRoutes.test");

describe("Routes", async function () {
  describe("Users", userTests.bind(this));
  describe("Menu", menuTests.bind(this));
  describe("Orders", orderTests.bind(this));
  describe("Delivery Routes", routeTests.bind(this));
});
