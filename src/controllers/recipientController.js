const Recipient = require("../models/Recipient");
const List = require("../models/List");
const Email = require("../models/Email");

// Create a new recipient
const createRecipient = async (req, res) => {
  try {
    const {
      email,
      name,
      firstName,
      lastName,
      company,
      lists,
      tags,
      customFields,
    } = req.body;

    // Check if recipient already exists for this user
    const existingRecipient = await Recipient.findOne({
      email,
      user: req.user._id,
    });

    if (existingRecipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient with this email already exists",
      });
    }

    // Create recipient
    const recipient = await Recipient.create({
      email,
      name,
      firstName,
      lastName,
      company,
      lists,
      tags,
      customFields,
      user: req.user._id,
      status: "active",
    });

    // Update list counts if lists are provided
    if (lists && lists.length > 0) {
      await List.updateMany(
        { _id: { $in: lists } },
        { $inc: { recipientCount: 1 } }
      );
    }

    res.status(201).json({
      success: true,
      data: recipient,
    });
  } catch (error) {
    console.error("Error creating recipient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create recipient",
      error: error.message,
    });
  }
};

// Get all recipients for the authenticated user
const getRecipients = async (req, res) => {
  try {
    // Build query based on filters
    const query = { user: req.user._id };

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by list if provided
    if (req.query.list) {
      query.lists = req.query.list;
    }

    // Filter by tag if provided
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    // Get recipients
    const recipients = await Recipient.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("lists", "name");

    // Get total count
    const total = await Recipient.countDocuments(query);

    res.status(200).json({
      success: true,
      count: recipients.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: recipients,
    });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipients",
      error: error.message,
    });
  }
};

// Get a single recipient
const getRecipient = async (req, res) => {
  try {
    const recipient = await Recipient.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("lists", "name");

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    res.status(200).json({
      success: true,
      data: recipient,
    });
  } catch (error) {
    console.error("Error fetching recipient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipient",
      error: error.message,
    });
  }
};

// Update recipient
const updateRecipient = async (req, res) => {
  try {
    const recipient = await Recipient.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Handle list changes if needed
    if (req.body.lists) {
      // Get current lists
      const currentLists = recipient.lists.map((list) => list.toString());

      // Find lists to add and remove
      const listsToAdd = req.body.lists.filter(
        (list) => !currentLists.includes(list)
      );
      const listsToRemove = currentLists.filter(
        (list) => !req.body.lists.includes(list)
      );

      // Update list counts
      if (listsToAdd.length > 0) {
        await List.updateMany(
          { _id: { $in: listsToAdd } },
          { $inc: { recipientCount: 1 } }
        );
      }

      if (listsToRemove.length > 0) {
        await List.updateMany(
          { _id: { $in: listsToRemove } },
          { $inc: { recipientCount: -1 } }
        );
      }
    }

    // Update recipient
    const updatedRecipient = await Recipient.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate("lists", "name");

    res.status(200).json({
      success: true,
      data: updatedRecipient,
    });
  } catch (error) {
    console.error("Error updating recipient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update recipient",
      error: error.message,
    });
  }
};

// Delete recipient
const deleteRecipient = async (req, res) => {
  try {
    const recipient = await Recipient.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Update list counts
    if (recipient.lists && recipient.lists.length > 0) {
      await List.updateMany(
        { _id: { $in: recipient.lists } },
        { $inc: { recipientCount: -1 } }
      );
    }

    await recipient.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting recipient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete recipient",
      error: error.message,
    });
  }
};

// Bulk import recipients
const bulkImportRecipients = async (req, res) => {
  try {
    const { recipients, listIds } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of recipients",
      });
    }

    // Validate each recipient has an email
    const invalidRecipients = recipients.filter((r) => !r.email);
    if (invalidRecipients.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All recipients must have an email address",
        invalidCount: invalidRecipients.length,
      });
    }

    // Get existing recipients to avoid duplicates
    const emails = recipients.map((r) => r.email);
    const existingRecipients = await Recipient.find({
      email: { $in: emails },
      user: req.user._id,
    });
    const existingEmails = existingRecipients.map((r) => r.email);

    // Filter out existing recipients
    const newRecipients = recipients.filter(
      (r) => !existingEmails.includes(r.email)
    );

    // Prepare recipients for import
    const recipientsToImport = newRecipients.map((r) => ({
      ...r,
      user: req.user._id,
      lists: listIds || [],
      status: "active",
    }));

    // Import recipients
    const importedRecipients = [];
    if (recipientsToImport.length > 0) {
      const result = await Recipient.insertMany(recipientsToImport);
      importedRecipients.push(...result);
    }

    // Update list counts if lists are provided
    if (listIds && listIds.length > 0 && importedRecipients.length > 0) {
      await List.updateMany(
        { _id: { $in: listIds } },
        { $inc: { recipientCount: importedRecipients.length } }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        total: recipients.length,
        imported: importedRecipients.length,
        duplicates: existingRecipients.length,
      },
    });
  } catch (error) {
    console.error("Error importing recipients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import recipients",
      error: error.message,
    });
  }
};

// Get recipient email history
const getRecipientEmailHistory = async (req, res) => {
  try {
    const recipient = await Recipient.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Get emails sent to this recipient
    const emails = await Email.find({
      recipient: recipient._id,
    })
      .sort({ sentAt: -1 })
      .populate("campaign", "name");

    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    console.error("Error fetching recipient email history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipient email history",
      error: error.message,
    });
  }
};

module.exports = {
  createRecipient,
  getRecipients,
  getRecipient,
  updateRecipient,
  deleteRecipient,
  bulkImportRecipients,
  getRecipientEmailHistory,
};
