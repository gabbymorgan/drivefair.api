const request = (firstName, businessName) => `
<html>
  <body>
    <h1>
      On our way, ${firstName}!
    </h1>
    <p>
      Your order from ${businessName} is on its way!
    </p>
  </body>
</html>
`;

module.exports = request;