const getAddressString = ({ street, unit, city, state, zip }) => {
  return `${street} ${unit ? "#" + unit : ""} ${city}, ${state} ${zip}`;
};

module.exports = {
  getAddressString,
};
