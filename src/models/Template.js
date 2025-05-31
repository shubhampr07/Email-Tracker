const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
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
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["newsletter", "promotion", "announcement", "follow-up", "custom"],
      default: "custom",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    thumbnail: {
      type: String,
    },
    variables: [
      {
        name: String,
        defaultValue: String,
        description: String,
      },
    ],
    lastUsedAt: {
      type: Date,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for user and name for faster lookups
TemplateSchema.index({ user: 1, name: 1 });

// Create a compound index for user and category for faster filtering
TemplateSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model("Template", TemplateSchema);
