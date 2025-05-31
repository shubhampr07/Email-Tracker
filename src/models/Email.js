const mongoose = require("mongoose");

const EmailSchema = new mongoose.Schema(
  {
    emailId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipient",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "opened", "clicked", "bounced", "failed"],
      default: "sent",
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    lastOpenedAt: {
      type: Date,
      default: null,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    device: {
      type: String,
    },
    location: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for user and campaign for faster queries
EmailSchema.index({ user: 1, campaign: 1 });

// Add compound index for user and status for faster filtering
EmailSchema.index({ user: 1, status: 1 });

// Add compound index for user and sentAt for faster sorting
EmailSchema.index({ user: 1, sentAt: -1 });

module.exports = mongoose.model("Email", EmailSchema);
