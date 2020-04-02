module.exports = (userType, firstName, token) => `
<html>
  <body>
    <h1>
      Welcome ${firstName}!
    </h1>
    <p>
      <a href="${process.env.APP_URL}/${userType}/confirmEmail?token=${token}">Click here</a> to confirm your email address.
    </p>
  </body>
</html>
`;
