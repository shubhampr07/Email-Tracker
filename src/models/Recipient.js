const mongoose = require("mongoose");

const RecipientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    name: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    lists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "List",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced", "complained"],
      default: "active",
      index: true,
    },
    unsubscribedAt: {
      type: Date,
    },
    lastEmailSentAt: {
      type: Date,
    },
    lastEmailOpenedAt: {
      type: Date,
    },
    totalEmailsSent: {
      type: Number,
      default: 0,
    },
    totalEmailsOpened: {
      type: Number,
      default: 0,
    },
    customFields: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for user and email for faster lookups and ensuring uniqueness per user
RecipientSchema.index({ user: 1, email: 1 }, { unique: true });

// Add compound index for user and status for faster filtering
RecipientSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Recipient", RecipientSchema);
