const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    template: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "paused", "cancelled"],
      default: "draft",
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    bounceCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    settings: {
      trackOpens: {
        type: Boolean,
        default: true,
      },
      trackClicks: {
        type: Boolean,
        default: true,
      },
      replyTo: {
        type: String,
        trim: true,
      },
      fromName: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for user and status for faster filtering
CampaignSchema.index({ user: 1, status: 1 });

// Add compound index for user and createdAt for faster sorting
CampaignSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Campaign", CampaignSchema);
