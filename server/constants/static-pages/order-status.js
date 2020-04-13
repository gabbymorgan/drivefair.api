const beingDelivered = (firstName, businessName) => `
<html>
  <body>
    <h1>
      On our way, ${firstName}!
    </h1>
    <p>
      Your order is on its way to you! Thank you for choosing ${businessName}!
    </p>
  </body>
</html>
`;

const readyForPickup = (firstName, businessName) => `
<html>
  <body>
    <h1>
      Ready for pickup, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is ready to be picked up!
    </p>
    <p>
      Be sure and tap
    </p>
  </body>
</html>
`;

const paidAndBeingMade = (firstName, businessName) => `
<html>
  <body>
    <h1>
      We're working on your order, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is all paid for and being made as you read this!
    </p>
  </body>
</html>
`;

module.exports = {
  beingDelivered,
  readyForPickup,
  paidAndBeingMade
};