module.exports = (token, setting) => `
<div>
  <p>
    To unsubscribe, click <a href="${process.env.APP_URL}/unsubscribe?token=${token}&setting=${setting}">here</a>.
  </p>
</div>`;
