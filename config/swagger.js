// config/swagger.js
const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description: "This is a simple API for URL shortening and analytics.",
    },
    servers: [
      {
        url: "http://localhost:5000", // Update for production environment if needed
      },
    ],
  },
  apis: ["./server.js"], // Path to your API route files
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = swaggerDocs;
