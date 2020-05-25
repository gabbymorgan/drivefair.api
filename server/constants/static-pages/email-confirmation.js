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
<html>
  <body>
    <script>setTimeout(() => window.location = "${process.env.FRONTEND_URL}", 3000)</script>
    <div style="height:100vh;display:flex;justify-content:center;align-items:center;text-align:center">
      <p style="font-size:2rem">
        Good jorb! Let's get out of here.
      </p>
    </div>
  </body>
</html>
`;

const unsubscribed = (setting) => `
<html>
  <body>
    <script>setTimeout(() => window.location = "${process.env.FRONTEND_URL}", 3000)</script>
    <div style="height:100vh;display:flex;justify-content:center;align-items:center;text-align:center">
      <p style="font-size:2rem">
        Unsubscribed from emails related to ${setting}. Redirecting...
      </p>
    </div>
  </body>
</html>
`;

module.exports = {
  confirmed,
  request,
  unsubscribed,
};
