const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: ".env.dev" });
const mongoose = require("mongoose");
const connectDB = require("./config/db.js");
const expressSession = require("express-session");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
const { nanoid } = require("nanoid");
const redis = require("redis");
const redisClient = redis.createClient();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./config/swagger");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const URL = require('./models/url'); 
const User = require('./models/User'); 
const ClickAnalytics = require('./models/analytics');

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("ready", () => console.log("Redis client connected"));
redisClient.connect();

redisClient.once("ready", () => {
  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many requests, please try again later."
    ,skip: () => process.env.NODE_ENV === "test", 
  });

  app.use(bodyParser.json());
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(cors({ origin: "http://localhost:5000", credentials: true }));
  app.use(
    expressSession({ secret: "1234ght", resave: true, saveUninitialized: true })
  );
  app.use(limiter);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


  connectDB();

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.clientid,
        clientSecret: process.env.clientsecret,
        callbackURL: "http://localhost:5000/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value || "",
            });
          }
          return cb(null, user);
        } catch (err) {
          return cb(err, null);
        }
      }
    )
  );
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(path.join(__dirname, "public")));
  app.use(cors({ origin: "http://localhost:5000", credentials: true }));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get("/url-shortner", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "shorten.html"));
  });
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => res.redirect("/url-shortner")
  );


  // Swagger documentation code

// Swagger comments for URL Shortener API
/**
 * @swagger
 * components:
 *   schemas:
 *     URL:
 *       type: object
 *       properties:
 *         longUrl:
 *           type: string
 *           description: The long URL that needs to be shortened
 *         shortUrl:
 *           type: string
 *           description: The generated shortened URL
 *         topic:
 *           type: string
 *           description: The topic for categorizing the URL
 *       required:
 *         - longUrl
 *         - shortUrl
 */

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Shorten a URL
 *     description: This endpoint takes a long URL and returns a shortened URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/URL'
 *     responses:
 *       200:
 *         description: Successfully created short URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortUrl:
 *                   type: string
 *                   description: The shortened URL
 *       400:
 *         description: Invalid input or custom alias already taken
 *       500:
 *         description: Internal server error
 */

  app.post("/api/shorten", async (req, res) => {
    const { longUrl, customAlias, topic } = req.body;
    const userId = req.user?.id;
    if (!longUrl)
      return res.status(400).json({ error: "Long URL is required" });

    const shortUrl = customAlias || nanoid(7);
    const existing = await URL.findOne({ shortUrl });
    if (existing)
      return res.status(400).json({ error: "Custom alias already taken" });

    const url = await URL.create({ longUrl, shortUrl, userId, topic });
    await redisClient.set(shortUrl, longUrl);

    res.status(200).send({
      shortUrl: `http://localhost:5000/${shortUrl}`,
      createdAt: url.createdAt,
    });
  });

  /**
 * @swagger
 * /api/shorten/{shortUrl}:
 *   get:
 *     summary: Redirect to the long URL from short URL
 *     description: This endpoint redirects a short URL to its corresponding long URL.
 *     parameters:
 *       - name: shortUrl
 *         in: path
 *         required: true
 *         description: The shortened URL identifier
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to the long URL
 *       404:
 *         description: URL not found
 */
  app.get("/:shortUrl", async (req, res) => {
    try {
      const { shortUrl } = req.params;
      let longUrl = await redisClient.get(shortUrl);

      if (!longUrl) {
        const urlDoc = await URL.findOne({ shortUrl });
        if (!urlDoc) return res.status(404).json({ error: "URL not found" });
        longUrl = urlDoc.longUrl;
        await redisClient.set(shortUrl, longUrl);
      }

      res.status(200).redirect(longUrl);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  /**
 * @swagger
 * /api/analytics/{alias}:
 *   get:
 *     summary: Get click analytics for a specific short URL
 *     description: Fetch analytics for a given short URL including click count, unique users, etc.
 *     parameters:
 *       - name: alias
 *         in: path
 *         required: true
 *         description: The short URL alias to fetch analytics for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics data for the short URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks for the short URL
 *                 uniqueUsers:
 *                   type: integer
 *                   description: Number of unique users who clicked the URL
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       clicks:
 *                         type: integer
 *                 osType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       osName:
 *                         type: string
 *                       uniqueClicks:
 *                         type: integer
 *                       uniqueUsers:
 *                         type: integer
 *                 deviceType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceName:
 *                         type: string
 *                       uniqueClicks:
 *                         type: integer
 *                       uniqueUsers:
 *                         type: integer
 *       404:
 *         description: URL not found
 */
  app.get("/api/analytics/:alias", async (req, res) => {
    const { alias } = req.params;

    const data = await getOrSetCache(`analytics:${alias}`, async () => {
      const urlDoc = await URL.findOne({ shortUrl: alias });
      if (!urlDoc) throw new Error("URL not found");

      const totalClicks = await ClickAnalytics.countDocuments({ urlId: alias });
      const uniqueUsers = await ClickAnalytics.distinct("ipAddress", {
        urlId: alias,
      }).length;

      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const clicksByDate = await ClickAnalytics.aggregate([
        { $match: { urlId: alias, timestamp: { $gte: last7Days } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const osType = await ClickAnalytics.aggregate([
        { $match: { urlId: alias } },
        {
          $group: {
            _id: "$os",
            uniqueClicks: { $sum: 1 },
            uniqueUsers: { $addToSet: "$ipAddress" },
          },
        },
        {
          $project: {
            osName: "$_id",
            uniqueClicks: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
      ]);

      const deviceType = await ClickAnalytics.aggregate([
        { $match: { urlId: alias } },
        {
          $group: {
            _id: "$device",
            uniqueClicks: { $sum: 1 },
            uniqueUsers: { $addToSet: "$ipAddress" },
          },
        },
        {
          $project: {
            deviceName: "$_id",
            uniqueClicks: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
      ]);

      return { totalClicks, uniqueUsers, clicksByDate, osType, deviceType };
    });

    res.json(data);
  });

  app.get("/api/analytics/topic/:topic", async (req, res) => {
    const { topic } = req.params;

    const urls = await URL.find({ topic });
    if (!urls.length) return res.status(404).json({ error: "Topic not found" });

    const totalClicks = await ClickAnalytics.countDocuments({
      urlId: { $in: urls.map((url) => url.shortUrl) },
    });
    const uniqueUsers = await ClickAnalytics.distinct("ipAddress", {
      urlId: { $in: urls.map((url) => url.shortUrl) },
    }).length;

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const clicksByDate = await ClickAnalytics.aggregate([
      {
        $match: {
          urlId: { $in: urls.map((url) => url.shortUrl) },
          timestamp: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const urlsData = await Promise.all(
      urls.map(async (url) => ({
        shortUrl: url.shortUrl,
        totalClicks: await ClickAnalytics.countDocuments({
          urlId: url.shortUrl,
        }),
        uniqueUsers: await ClickAnalytics.distinct("ipAddress", {
          urlId: url.shortUrl,
        }).length,
      }))
    );

    res.json({ totalClicks, uniqueUsers, clicksByDate, urls: urlsData });
  });

  app.get("/api/analytics/overall", async (req, res) => {
    const userId = req.user.id;

    const urls = await URL.find({ userId });
    if (!urls.length) return res.status(404).json({ error: "No URLs found" });

    const totalUrls = urls.length;
    const totalClicks = await ClickAnalytics.countDocuments({
      urlId: { $in: urls.map((url) => url.shortUrl) },
    });
    const uniqueUsers = await ClickAnalytics.distinct("ipAddress", {
      urlId: { $in: urls.map((url) => url.shortUrl) },
    }).length;

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const clicksByDate = await ClickAnalytics.aggregate([
      {
        $match: {
          urlId: { $in: urls.map((url) => url.shortUrl) },
          timestamp: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const osType = await ClickAnalytics.aggregate([
      { $match: { urlId: { $in: urls.map((url) => url.shortUrl) } } },
      {
        $group: {
          _id: "$os",
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: "$ipAddress" },
        },
      },
      {
        $project: {
          osName: "$_id",
          uniqueClicks: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
    ]);

    const deviceType = await ClickAnalytics.aggregate([
      { $match: { urlId: { $in: urls.map((url) => url.shortUrl) } } },
      {
        $group: {
          _id: "$device",
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: "$ipAddress" },
        },
      },
      {
        $project: {
          deviceName: "$_id",
          uniqueClicks: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
    ]);

    res.json({
      totalUrls,
      totalClicks,
      uniqueUsers,
      clicksByDate,
      osType,
      deviceType,
    });
  });

  const getOrSetCache = async (key, cb) => {
    const data = await redisClient.get(key);
    if (data) return JSON.parse(data);

    const newData = await cb();
    redisClient.set(key, JSON.stringify(newData), "EX", 60 * 5); 
    return newData;
  };


  app.get("/api/shorten/:shortUrl", async (req, res) => {
    const { shortUrl } = req.params;
    let longUrl = await redisClient.get(shortUrl);

    if (!longUrl) {
      const urlDoc = await URL.findOne({ shortUrl });
      if (!urlDoc) return res.status(404).json({ error: "URL not found" });
      longUrl = urlDoc.longUrl;
      await redisClient.set(shortUrl, longUrl); 
    }

    
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const geoData = await axios
      .get(`http://ip-api.com/json/${ip}`)
      .then((res) => res.data.city)
      .catch(() => "Unknown");

   
    await ClickAnalytics.create({
      urlId: shortUrl,
      ipAddress: ip,
      userAgent,
      geoLocation: geoData,
      os: "Unknown", 
      device: "Unknown",
    });

 
    res.redirect(longUrl);
  });


  app.listen(5000, () => console.log("Server running on port 5000"));
});

module.exports = app;
