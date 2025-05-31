const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const Email = require("../models/Email");
const Campaign = require("../models/Campaign");
const Recipient = require("../models/Recipient");
const User = require("../models/User");
const Template = require("../models/Template");

// Configure nodemailer transporter
const createTransporter = (user) => {
  // If user has custom SMTP settings, use those
  if (user.smtpSettings && user.smtpSettings.host) {
    return nodemailer.createTransport({
      host: user.smtpSettings.host,
      port: user.smtpSettings.port,
      secure: user.smtpSettings.port === 465,
      auth: {
        user: user.smtpSettings.username,
        pass: user.smtpSettings.password,
      },
    });
  }

  // Otherwise use default system SMTP settings
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email with tracking pixel
const sendEmail = async (req, res) => {
  const { recipient, subject, content, campaignId, templateId } = req.body;

  if (!recipient || !subject || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide recipient, subject, and content",
    });
  }

  try {
    // Get user from request (set by auth middleware)
    const user = req.user;

    // Check if user has exceeded their email quota
    if (user.emailsSent >= user.emailQuota) {
      return res.status(403).json({
        success: false,
        message: "Email quota exceeded",
      });
    }

    // Generate unique ID for tracking
    const emailId = uuidv4();

    // Create tracking pixel URL
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    // Ensure we're using a public URL for tracking
    if (baseUrl.includes("localhost")) {
      console.error(
        "[ERROR] Cannot use localhost for email tracking. Please set BASE_URL to a public URL in your .env file"
      );
      return res.status(500).json({
        success: false,
        message:
          "Invalid tracking URL configuration. Please set BASE_URL to a public URL.",
      });
    }

    const trackingPixelUrl = `${baseUrl}/track/open?emailId=${emailId}`;
    console.log("[DEBUG] Generated tracking pixel URL:", trackingPixelUrl);
    console.log("[DEBUG] BASE_URL from env:", baseUrl);

    // Create a more discreet tracking implementation
    const trackingHtml = `
    <!-- Email content -->
    <div style="display:none;">
      <img src="${trackingPixelUrl}" width="0" height="0" alt="" style="position:absolute;visibility:hidden;pointer-events:none;opacity:0;z-index:-1;">
    </div>`;

    // Append tracking to email content
    const emailContent = `${content}${trackingHtml}`;
    console.log("[DEBUG] Email content with tracking pixel:", emailContent);

    // Get campaign if provided
    let campaign = null;
    if (campaignId) {
      campaign = await Campaign.findOne({ _id: campaignId, user: user._id });
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }
    }

    // Get or create recipient
    let recipientDoc = await Recipient.findOne({
      email: recipient,
      user: user._id,
    });
    if (!recipientDoc) {
      recipientDoc = await Recipient.create({
        email: recipient,
        user: user._id,
        status: "active",
      });
    }

    // Create transporter
    const transporter = createTransporter(user);

    // Send email
    const info = await transporter.sendMail({
      from: user.smtpSettings?.fromEmail || process.env.EMAIL_FROM,
      to: recipient,
      subject: subject,
      html: emailContent,
      headers: {
        "X-Entity-Ref-ID": emailId,
        "List-Unsubscribe": `<${baseUrl}/unsubscribe?emailId=${emailId}>`,
        Precedence: "bulk",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });

    // Save email to database
    const email = new Email({
      emailId,
      recipient,
      subject,
      content: emailContent,
      status: "sent",
      sentAt: new Date(),
      user: user._id,
      campaign: campaign ? campaign._id : null,
      recipient: recipientDoc._id,
    });

    await email.save();

    // Update user's emailsSent count
    user.emailsSent += 1;
    user.lastEmailSentAt = new Date();
    await user.save();

    // Update recipient's stats
    recipientDoc.lastEmailSentAt = new Date();
    recipientDoc.totalEmailsSent += 1;
    await recipientDoc.save();

    // Update campaign stats if applicable
    if (campaign) {
      campaign.sentCount += 1;
      if (!campaign.sentAt) {
        campaign.sentAt = new Date();
        campaign.status = "sending";
      }
      await campaign.save();
    }

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: {
        emailId,
        messageId: info.messageId,
      },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

// Track email opens
const trackEmailOpen = async (req, res) => {
  const { emailId, method } = req.query;

  console.log(
    `[TRACKING] Received tracking request for emailId: ${emailId}, method: ${
      method || "default"
    }`
  );

  if (!emailId) {
    console.log("[TRACKING] No emailId provided, returning transparent pixel");
    return sendTransparentPixel(res);
  }

  try {
    // Find email by emailId
    const email = await Email.findOne({ emailId });

    console.log(`[TRACKING] Email found: ${email ? "Yes" : "No"}`);

    if (email) {
      console.log(
        `[TRACKING] Current email status: ${email.status}, openCount: ${email.openCount}`
      );

      // Collect tracking data
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const referer = req.headers["referer"] || "direct";

      // Check if this is a duplicate tracking request within the last minute
      const oneMinuteAgo = new Date(Date.now() - 60000);
      if (email.lastOpenedAt && email.lastOpenedAt > oneMinuteAgo) {
        console.log("[TRACKING] Duplicate tracking request detected, skipping count increment");
        return sendTransparentPixel(res);
      }

      // Update email status and openedAt if it's the first open
      if (email.status === "sent") {
        email.status = "opened";
        email.openedAt = new Date();
        console.log("[TRACKING] Updated status to opened");
      }

      // Increment open count and update last opened timestamp
      email.openCount += 1;
      email.lastOpenedAt = new Date();
      email.ipAddress = ipAddress;
      email.userAgent = userAgent;

      // Add tracking metadata
      if (!email.metadata) email.metadata = {};
      email.metadata.referer = referer;

      console.log(`[TRACKING] Incremented openCount to ${email.openCount}`);
      console.log(`[TRACKING] Tracking method: ${method}`);
      console.log(`[TRACKING] Referer: ${referer}`);

      // Simple device detection
      if (userAgent) {
        if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
          email.device = "mobile";
        } else if (/tablet|ipad/i.test(userAgent)) {
          email.device = "tablet";
        } else {
          email.device = "desktop";
        }
        console.log(`[TRACKING] Detected device: ${email.device}`);
      }

      try {
        await email.save();
        console.log("[TRACKING] Successfully saved email update");
      } catch (saveError) {
        console.error("[TRACKING] Error saving email:", saveError);
      }

      // Update recipient stats if available
      if (email.recipient) {
        console.log(
          `[TRACKING] Attempting to update recipient: ${email.recipient}`
        );
        try {
          const recipient = await Recipient.findById(email.recipient);
          if (recipient) {
            console.log("[TRACKING] Recipient found, updating stats");
            recipient.lastEmailOpenedAt = new Date();
            recipient.totalEmailsOpened += 1;
            await recipient.save();
            console.log("[TRACKING] Recipient stats updated successfully");
          } else {
            console.log("[TRACKING] Recipient not found");
          }
        } catch (recipientError) {
          console.error("[TRACKING] Error updating recipient:", recipientError);
        }
      } else {
        console.log("[TRACKING] No recipient associated with this email");
      }

      // Update campaign stats if available
      if (email.campaign) {
        console.log(
          `[TRACKING] Attempting to update campaign: ${email.campaign}`
        );
        try {
          const campaign = await Campaign.findById(email.campaign);
          if (campaign) {
            console.log("[TRACKING] Campaign found, updating stats");
            campaign.openCount += 1;
            await campaign.save();
            console.log("[TRACKING] Campaign stats updated successfully");
          } else {
            console.log("[TRACKING] Campaign not found");
          }
        } catch (campaignError) {
          console.error("[TRACKING] Error updating campaign:", campaignError);
        }
      } else {
        console.log("[TRACKING] No campaign associated with this email");
      }
    }

    // Return a transparent 1x1 GIF
    sendTransparentPixel(res);
  } catch (error) {
    console.error("Error tracking email open:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Still return the pixel even if there's an error
    sendTransparentPixel(res);
  }
};

// Helper function to send a transparent 1x1 GIF
const sendTransparentPixel = (res) => {
  // 1x1 transparent GIF in hex
  const transparentGifBuffer = Buffer.from(
    "47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b",
    "hex"
  );

  // Set headers to prevent caching and make it look like a regular image
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Content-Length", transparentGifBuffer.length);
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.setHeader("ETag", '"' + Date.now() + '"');
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.setHeader("Accept-Ranges", "bytes");

  // Send the transparent GIF
  res.end(transparentGifBuffer);
};

// Get all emails for the authenticated user
const getAllEmails = async (req, res) => {
  try {
    const emails = await Email.find({ user: req.user._id })
      .sort({ sentAt: -1 })
      .populate("campaign", "name")
      .populate("recipient", "email name");

    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch emails",
      error: error.message,
    });
  }
};

// Get email by ID
const getEmailById = async (req, res) => {
  try {
    const email = await Email.findOne({
      emailId: req.params.id,
      user: req.user._id,
    })
      .populate("campaign", "name")
      .populate("recipient", "email name");

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    res.status(200).json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email",
      error: error.message,
    });
  }
};

// Get email statistics
const getEmailStats = async (req, res) => {
  try {
    // Get total emails sent
    const totalSent = await Email.countDocuments({ user: req.user._id });

    // Get total emails opened
    const totalOpened = await Email.countDocuments({
      user: req.user._id,
      status: "opened",
    });

    // Get open rate
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    // Get emails sent in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSent = await Email.countDocuments({
      user: req.user._id,
      sentAt: { $gte: thirtyDaysAgo },
    });

    // Get emails opened in the last 30 days
    const recentOpened = await Email.countDocuments({
      user: req.user._id,
      status: "opened",
      openedAt: { $gte: thirtyDaysAgo },
    });

    // Get recent open rate
    const recentOpenRate =
      recentSent > 0 ? (recentOpened / recentSent) * 100 : 0;

    // Get device breakdown
    const deviceStats = await Email.aggregate([
      { $match: { user: req.user._id, device: { $exists: true, $ne: null } } },
      { $group: { _id: "$device", count: { $sum: 1 } } },
    ]);

    const devices = {};
    deviceStats.forEach((stat) => {
      devices[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalSent,
        totalOpened,
        openRate: openRate.toFixed(2),
        recentSent,
        recentOpened,
        recentOpenRate: recentOpenRate.toFixed(2),
        devices,
      },
    });
  } catch (error) {
    console.error("Error fetching email statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email statistics",
      error: error.message,
    });
  }
};

module.exports = {
  sendEmail,
  trackEmailOpen,
  getAllEmails,
  getEmailById,
  getEmailStats,
};
