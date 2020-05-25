const unsubscribe = require("./unsubscribe");

const delivered = (firstName, lastName, token) => `
<html>
  <body>
    <h1>
      We did it!!!
    </h1>
    <p>
      Order for ${firstName} ${lastName ? lastName[0] : ""} has been delivered!
    </p>
    ${unsubscribe(token, "ORDER_DELIVERED")}
  </body>
</html>
`;

const paid = (firstName, lastName, token) => `
<html>
  <body>
    <h1>
      Incoming order from ${firstName} ${lastName ? lastName[0] : ""}!
    </h1>
    <p>
      Let's get started!
    </p>
    ${unsubscribe(token, "ORDER_PAID")}
  </body>
</html>
`;

const refunded = (firstName, lastName, token) => `
<html>
  <body>
    <h1>
      Order ${firstName} ${lastName ? lastName[0] : ""} has been refunded.
    </h1>
    <p>
      Let's get started!
    </p>
    ${unsubscribe(token, "ORDER_PAID")}
  </body>
</html>
`;

module.exports = {
  paid,
  delivered,
  refunded,
};
