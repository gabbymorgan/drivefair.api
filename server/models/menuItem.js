const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: {
    type: String,
    validator: function (imageUrl) {
      return /^\w+$/.test(imageUrl);
    },
    message: (props) => `${props.value} is not a valid imgur URI path!`,
  },
  price: { type: Number, required: true },
  createdOn: { type: Date, default: Date.now },
  modifiedOn: { type: Date, default: Date.now },
  modifications: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Modification" },
  ],
});

module.exports = mongoose.model("MenuItem", menuItemSchema);
