const unsubscribe = require("./unsubscribe");

const delivered = (firstName, businessName, token) => `
<html>
  <body>
    <h1>
      On our way, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is at your door! Thank you for choosing DriveFair!
    </p>
    ${unsubscribe(token, "ORDER_DELIVERED")}
  </body>
</html>
`;

const readyForPickup = (firstName, businessName, token, setting) => `
<html>
  <body>
    <h1>
      Ready for pickup, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is ready to be picked up! Thank you for choosing DriveFair!
    </p>
    <p>
      Be sure and tap
    </p>
    ${unsubscribe(token, "ORDER_READY_FOR_PICKUP")}
  </body>
</html>
`;

const paid = (firstName, businessName, token) => `
<html>
  <body>
    <h1>
      We're working on your order, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is in the works at this very moment!
    </p>
    ${unsubscribe(token, "ORDER_PAID")}
  </body>
</html>
`;

const refunded = (businessName, token) => `
<html>
  <body>
    <h1>
      Your order has been refunded
    </h1>
    <p>
      Your order from ${businessName} has been refunded.
    </p>
    ${unsubscribe(token, "ORDER_REFUNDED")}
  </body>
</html>
`;

module.exports = {
  readyForPickup,
  paid,
  delivered,
  refunded,
};
