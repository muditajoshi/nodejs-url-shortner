const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  createdAt: { type: Date, default: Date.now },
});

// Use mongoose.models to check if the model is already defined
const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
