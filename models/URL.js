const mongoose = require("mongoose");
const ClickAnalytics = require("../models/analytics");

const URLSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortUrl: { type: String, unique: true },
  userId: String,
  topic: String,
  createdAt: { type: Date, default: Date.now },
  clickAnalytics: [ClickAnalytics.schema], // Reference ClickAnalytics schema
});

const URL = mongoose.model("URL", URLSchema);

module.exports = URL;
