const Campaign = require("../models/Campaign");
const Email = require("../models/Email");
const Recipient = require("../models/Recipient");
const Template = require("../models/Template");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// Create a new campaign
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      template,
      recipientListIds,
      scheduledFor,
    } = req.body;

    // Create campaign
    const campaign = await Campaign.create({
      name,
      description,
      subject,
      template,
      user: req.user._id,
      status: scheduledFor ? "scheduled" : "draft",
      scheduledFor: scheduledFor || null,
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: error.message,
    });
  }
};

// Get all campaigns for the authenticated user
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
      error: error.message,
    });
  }
};

// Get a single campaign
const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaign",
      error: error.message,
    });
  }
};

// Update campaign
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update campaign",
      error: error.message,
    });
  }
};

// Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Don't allow deletion of campaigns that have been sent
    if (campaign.status === "sent" || campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a campaign that has been sent",
      });
    }

    await campaign.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  }
};

// Send a campaign
const sendCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Check if campaign is already sent
    if (campaign.status === "sent") {
      return res.status(400).json({
        success: false,
        message: "Campaign has already been sent",
      });
    }

    // Get recipients from request body or from campaign's lists
    const { recipientIds } = req.body;
    let recipients = [];

    if (recipientIds && recipientIds.length > 0) {
      recipients = await Recipient.find({
        _id: { $in: recipientIds },
        user: req.user._id,
        status: "active",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "No recipients specified",
      });
    }

    // Check if there are any recipients
    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active recipients found",
      });
    }

    // Check if user has enough quota
    const user = req.user;
    if (user.emailsSent + recipients.length > user.emailQuota) {
      return res.status(403).json({
        success: false,
        message: "Email quota would be exceeded",
      });
    }

    // Update campaign status
    campaign.status = "sending";
    campaign.sentAt = new Date();
    campaign.totalRecipients = recipients.length;
    await campaign.save();

    // Start sending emails (async)
    sendCampaignEmails(campaign, recipients, user);

    res.status(200).json({
      success: true,
      message: "Campaign sending started",
      data: campaign,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send campaign",
      error: error.message,
    });
  }
};

// Helper function to send campaign emails
const sendCampaignEmails = async (campaign, recipients, user) => {
  try {
    // Create transporter
    const transporter = createTransporter(user);

    // Get template if used
    let templateContent = campaign.template;
    if (campaign.templateId) {
      const template = await Template.findOne({
        _id: campaign.templateId,
        user: user._id,
      });
      if (template) {
        templateContent = template.content;
      }
    }

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        // Generate unique ID for tracking
        const emailId = uuidv4();

        // Create tracking pixel URL
        const trackingPixelUrl = `${process.env.BASE_URL}/track/open?emailId=${emailId}`;

        // Personalize content for recipient
        let personalizedContent = templateContent || campaign.template;
        let personalizedSubject = campaign.subject;

        // Replace variables in content and subject
        if (recipient.name) {
          personalizedContent = personalizedContent.replace(
            /\{\{name\}\}/g,
            recipient.name
          );
          personalizedSubject = personalizedSubject.replace(
            /\{\{name\}\}/g,
            recipient.name
          );
        }
        if (recipient.firstName) {
          personalizedContent = personalizedContent.replace(
            /\{\{firstName\}\}/g,
            recipient.firstName
          );
          personalizedSubject = personalizedSubject.replace(
            /\{\{firstName\}\}/g,
            recipient.firstName
          );
        }
        if (recipient.lastName) {
          personalizedContent = personalizedContent.replace(
            /\{\{lastName\}\}/g,
            recipient.lastName
          );
          personalizedSubject = personalizedSubject.replace(
            /\{\{lastName\}\}/g,
            recipient.lastName
          );
        }
        if (recipient.email) {
          personalizedContent = personalizedContent.replace(
            /\{\{email\}\}/g,
            recipient.email
          );
          personalizedSubject = personalizedSubject.replace(
            /\{\{email\}\}/g,
            recipient.email
          );
        }
        if (recipient.company) {
          personalizedContent = personalizedContent.replace(
            /\{\{company\}\}/g,
            recipient.company
          );
          personalizedSubject = personalizedSubject.replace(
            /\{\{company\}\}/g,
            recipient.company
          );
        }

        // Add tracking pixel
        const emailContent = `${personalizedContent}<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;">`;

        // Send email
        const info = await transporter.sendMail({
          from: user.smtpSettings?.fromEmail || process.env.EMAIL_FROM,
          to: recipient.email,
          subject: personalizedSubject,
          html: emailContent,
        });

        // Save email to database
        const email = new Email({
          emailId,
          recipient: recipient.email,
          subject: personalizedSubject,
          content: emailContent,
          status: "sent",
          sentAt: new Date(),
          user: user._id,
          campaign: campaign._id,
          recipient: recipient._id,
        });

        await email.save();

        // Update recipient's stats
        recipient.lastEmailSentAt = new Date();
        recipient.totalEmailsSent += 1;
        await recipient.save();

        // Update campaign stats
        campaign.sentCount += 1;
        await campaign.save();

        // Update user's emailsSent count
        user.emailsSent += 1;
        await user.save();

        // Add a small delay to prevent overwhelming the email server
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        // Continue with next recipient even if one fails
      }
    }

    // Update campaign as completed
    campaign.status = "sent";
    campaign.completedAt = new Date();
    await campaign.save();
  } catch (error) {
    console.error("Error in sendCampaignEmails:", error);
    // Update campaign status to error
    campaign.status = "error";
    await campaign.save();
  }
};

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

// Get campaign statistics
const getCampaignStats = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Get email stats for this campaign
    const totalSent = await Email.countDocuments({ campaign: campaign._id });
    const totalOpened = await Email.countDocuments({
      campaign: campaign._id,
      status: "opened",
    });
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    // Get device breakdown
    const deviceStats = await Email.aggregate([
      {
        $match: {
          campaign: campaign._id,
          device: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$device", count: { $sum: 1 } } },
    ]);

    const devices = {};
    deviceStats.forEach((stat) => {
      devices[stat._id] = stat.count;
    });

    // Get hourly open data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hourlyOpenData = await Email.aggregate([
      {
        $match: {
          campaign: campaign._id,
          status: "opened",
          openedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$openedAt" },
            month: { $month: "$openedAt" },
            day: { $dayOfMonth: "$openedAt" },
            hour: { $hour: "$openedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    // Format hourly data
    const hourlyData = hourlyOpenData.map((item) => ({
      date: new Date(
        item._id.year,
        item._id.month - 1,
        item._id.day,
        item._id.hour
      ),
      count: item.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalSent,
        totalOpened,
        openRate: openRate.toFixed(2),
        devices,
        hourlyData,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaign statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignStats,
};
