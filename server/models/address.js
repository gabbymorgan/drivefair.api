const mongoose = require("mongoose");
const axios = require("axios");

const addressSchema = new mongoose.Schema({
  city: { type: String, required: [true, "City is required."] },
  state: { type: String, required: [true, "State is required."] },
  street: { type: String, required: [true, "Street is required."] },
  unit: Number,
  zip: { type: Number, required: [true, "Zip is required."] },
  latitude: Number,
  longitude: Number,
  note: { type: String },
  createdOn: { type: Date, default: Date.now },
  modifiedOn: { type: Date, default: Date.now },
  lat: Number,
  lng: Number,
});

addressSchema.pre("save", async function () {
  try {
    const geolocationResponse = await axios.get(
      "http://open.mapquestapi.com/geocoding/v1/address?key=" +
        process.env.MAP_API_KEY +
        "&location=" +
        this.street +
        " " +
        this.city +
        ", " +
        this.state +
        " " +
        this.zip
    );
    const {
      lat,
      lng,
    } = geolocationResponse.data.results[0].locations[0].latLng;
    this.lat = lat;
    this.lng = lng;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "saveAddress" } };
  }
});

module.exports = mongoose.model("Address", addressSchema);
