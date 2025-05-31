const express = require("express");
const router = express.Router();
const {
  sendEmail,
  getAllEmails,
  getEmailById,
  getEmailStats,
} = require("../controllers/emailController");
const { protect, apiAuth } = require("../middleware/auth");

// Protected email routes
router.post("/", protect, sendEmail);
router.get("/", protect, getAllEmails);
router.get("/stats", protect, getEmailStats);
router.get("/:id", protect, getEmailById);

// API routes (protected by API key)
router.post("/api/send", apiAuth, sendEmail);

module.exports = router;
