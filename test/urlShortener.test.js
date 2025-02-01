process.env.NODE_ENV = "test";

const request = require("supertest"); 
const express = require("express");
const app = require("../server.js");
const agent = request.agent(app); 
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });
const connectDB = require("../config/db");
const URL = require("../models/url"); 
const User = require("../models/User");
const ClickAnalytics = require("../models/analytics");

// beforeAll(async () => {
//   // Set up the MongoDB connection for testing
//   connectDB();
// });

console.log("Server is running:", app ? "Yes" : "No");

afterEach(async () => {
  await URL.deleteMany({});
  await User.deleteMany({});
  await ClickAnalytics.deleteMany({});
});

// afterAll(async () => {
//   // Close the database connection after tests
//   await mongoose.disconnect();
// });

describe("URL Shortener API", () => {
  describe("POST /api/shorten", () => {
    it("should verify that the server is running", async () => {
      const res = await request(app).get("/"); 
      console.log(res.status, res.text); 
    });
    
    it("should return 200 for the /api/shorten route", async () => {
      const res = await request(app).post("/api/shorten").send({ longUrl: "https://example.com" });
      console.log("POST /api/shorten Response:", res.status, res.body);
    });
it("should create a new short URL", async () => {
  const res = await request(app)
    .post("/api/shorten")
    .send({ longUrl: "https://example.com", customAlias: "abc" });
  
  console.log("Response:", res.status, res.body); 
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("shortUrl");
  expect(res.body).toHaveProperty("createdAt");
});

    it("should return error if long URL is not provided", async () => {
      const res = await request(app).post("/api/shorten").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Long URL is required");
    });

    it("should return error if custom alias is already taken", async () => {
      const customAlias = "customAlias";
      await request(app)
        .post("/api/shorten")
        .send({ longUrl: "https://example.com", customAlias });

      const res = await request(app)
        .post("/api/shorten")
        .send({ longUrl: "https://example.org", customAlias });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Custom alias already taken");
    });
  });

  describe("GET /api/shorten/:shortUrl", () => {
    it("should redirect to the long URL", async () => {
      const res = await request(app)
        .post("/api/shorten")
        .send({ longUrl: "https://example.com" });
  
      const shortUrl = res.body.shortUrl.split("/").pop(); 
  
      const redirectRes = await request(app).get(`/api/shorten/${shortUrl}`);
  
      expect(redirectRes.status).toBe(302); 
      expect(redirectRes.headers.location).toBe("https://example.com"); 
    });
  
    it("should return error if short URL does not exist", async () => {
      const res = await request(app).get("/api/shorten/nonexistentShortUrl");
  
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "URL not found");
    });
  });
  

  // describe("GET /api/analytics/:alias", () => {
  //   it("should return analytics for a given short URL", async () => {
  //     const analyticsRes = await request(app).get(`/api/analytics/${alias}`);

  //     expect(analyticsRes.status).toBe(200);
  //     expect(analyticsRes.body).toHaveProperty("totalClicks");
  //     expect(analyticsRes.body).toHaveProperty("uniqueUsers");
  //     expect(analyticsRes.body).toHaveProperty("clicksByDate");
  //   });

  //   it("should return error if URL alias does not exist", async () => {
  //     const res = await request(app).get("/api/analytics/nonexistentAlias");

  //     expect(res.status).toBe(404);
  //     expect(res.body).toHaveProperty("error", "URL not found");
  //   },20000); // Increase timeout if needed
  // });

  // describe("GET /api/analytics/topic/:topic", () => {
  //   it("should return analytics for a given topic", async () => {
  //     const topic = "exampleTopic";
  //     const res = await request(app)
  //       .post("/api/shorten")
  //       .send({ longUrl: "https://example.com", topic });

  //     const shortUrl = res.body.shortUrl;

  //     const topicAnalyticsRes = await request(app).get(
  //       `/api/analytics/topic/${topic}`
  //     );

  //     expect(topicAnalyticsRes.status).toBe(200);
  //     expect(topicAnalyticsRes.body).toHaveProperty("totalClicks");
  //     expect(topicAnalyticsRes.body).toHaveProperty("uniqueUsers");
  //     expect(topicAnalyticsRes.body).toHaveProperty("clicksByDate");
  //     expect(topicAnalyticsRes.body).toHaveProperty("urls");
  //   });

  //   it("should return error if topic does not exist", async () => {
  //     const res = await request(app).get(
  //       "/api/analytics/topic/nonexistentTopic"
  //     );

  //     expect(res.status).toBe(404);
  //     expect(res.body).toHaveProperty("error", "Topic not found");
  //   });
  // });

  // describe("GET /api/analytics/overall", () => {
  //   it("should return overall analytics for the authenticated user", async () => {
  //     // Create a test user and save to database
  //     const user = new User({
  //       googleId: "12345",
  //       email: "test@example.com",
  //       name: "Test User",
  //     });
  //     await user.save();
  
  //     // Use an agent for maintaining the session
  //     const agent = request.agent(app);
      
  //     // Simulate the user logging in via Google OAuth
  //     await agent
  //       .post("/auth/google/callback")
  //       .send({ googleId: user.googleId });
  
  //     // Create a shortened URL for the user
  //     await agent
  //       .post("/api/shorten")
  //       .send({ longUrl: "https://example.com" });
  
  //     // Fetch overall analytics for the authenticated user
  //     const overallAnalyticsRes = await agent.get("/api/analytics/overall");
  
  //     // Check if the response is successful and contains the required data
  //     expect(overallAnalyticsRes.status).toBe(200);
  //     expect(overallAnalyticsRes.body).toHaveProperty("totalUrls");
  //     expect(overallAnalyticsRes.body).toHaveProperty("totalClicks");
  //     expect(overallAnalyticsRes.body).toHaveProperty("uniqueUsers");
  //     expect(overallAnalyticsRes.body).toHaveProperty("clicksByDate");
  //     expect(overallAnalyticsRes.body).toHaveProperty("osType");
  //     expect(overallAnalyticsRes.body).toHaveProperty("deviceType");
  //   },10000);
  
  //   it("should return error if no URLs found for the user", async () => {
  //     // Create a test user and save to database
  //     const user = new User({
  //       googleId: "12345",
  //       email: "test@example.com",
  //       name: "Test User",
  //     });
  //     await user.save();
  
  //     // Use an agent for maintaining the session
  //     const agent = request.agent(app);
      
  //     // Simulate the user logging in via Google OAuth
  //     await agent
  //       .post("/auth/google/callback")
  //       .send({ googleId: user.googleId });
  
  //     // Attempt to fetch overall analytics for the user without creating URLs
  //     const res = await agent.get("/api/analytics/overall");
  
  //     // Check that the correct error is returned if no URLs exist
  //     expect(res.status).toBe(404);
  //     expect(res.body).toHaveProperty("error", "No URLs found");
  //   });
  // });
  
});
