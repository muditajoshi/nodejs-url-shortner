const mongoose = require("mongoose");

const ClickAnalyticsSchema = new mongoose.Schema({
  urlId: String,
  ipAddress: String,
  userAgent: String,
  geoLocation: String,
  os: String,
  device: String,
  timestamp: { type: Date, default: Date.now },
});

const ClickAnalytics = mongoose.models.ClickAnalytics || mongoose.model("ClickAnalytics", ClickAnalyticsSchema);

module.exports = ClickAnalytics;
