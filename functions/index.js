const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set environment variables for serverless execution
process.env.FIREBASE_FUNCTIONS = "true";
process.env.NODE_ENV = "production";

// Load environment variables from parent .env if exists (for local testing/emulators)
try {
  require("dotenv").config({ path: "../.env" });
} catch (e) {}

// Import the bundled Express app
const { app } = require("./server.cjs");

// Export the HTTPS function 'api'
exports.api = onRequest({
  cors: true,
  timeoutSeconds: 120,
  memory: "1GiB"
}, app);
