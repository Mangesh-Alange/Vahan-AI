// Set environment variables for serverless execution
process.env.FIREBASE_FUNCTIONS = "true"; // reuse our existing serverless flag
process.env.NODE_ENV = "production";

// Import the compiled Express app
const { app } = require("../dist/server.cjs");

// Export the Express app as a Vercel Serverless Function
module.exports = app;
