const request = (userType, name, token) => `
<html>
  <body>
    <h1>
      Welcome ${name}!
    </h1>
    <p>
      <a href="${process.env.APP_URL}/${userType}/confirmEmail?token=${token}">Click here</a> to confirm your email address.
    </p>
  </body>
</html>
`;

const confirmed = () => `
  <div style="height:100vh;display:flex;justify-content:center;align-items:center;text-align:center">
    <p style="font-size:2rem">
      Good jorb!
    </p>
  </div>
`;

module.exports = {
  confirmed,
  request
}
