require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

// Route files
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const recipientRoutes = require("./routes/recipientRoutes");
const listRoutes = require("./routes/listRoutes");
const templateRoutes = require("./routes/templateRoutes");

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5174",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/recipients", recipientRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/templates", templateRoutes);
app.use("/track", trackingRoutes);

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Email Tracking SaaS API is running");
});

// Error handler middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
