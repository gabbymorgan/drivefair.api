const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Setting name is required."] },
  value: { type: Object, required: [true, "Setting value is required."] },
  prevName: String,
  prevValue: Object,
  createdOn: { type: Date, default: Date.now },
  createdBy: { type: String, required: [true, "Unauthorized."] },
  modifiedOn: Date,
  modifiedBy: String,
});

settingSchema.methods.updateSetting = async function (name, value, user) {
  try {
    if (value && value !== this.value) {
      this.prevValue = this.value;
      this.value = value;
      this.modifiedOn = new Date();
      this.modifiedBy = user;
    }
    if (name && name !== this.name) {
      this.prevName = this.name;
      this.name = name;
      this.modifiedOn = new Date();
      this.modifiedBy = user;
    }
    await this.save();
    return this;
  } catch (error) {
    const errorString = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return { error: { errorString, functionName: "updateSetting" } };
  }
};

module.exports = mongoose.model("Setting", settingSchema);
