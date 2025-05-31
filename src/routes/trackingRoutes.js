const express = require("express");
const router = express.Router();
const { trackEmailOpen } = require("../controllers/emailController");

// Add logging middleware
router.use((req, res, next) => {
  console.log("[TRACKING ROUTE] Received request:", {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    ip: req.ip,
  });
  next();
});

// Tracking routes
router.get("/open", trackEmailOpen);

module.exports = router;
