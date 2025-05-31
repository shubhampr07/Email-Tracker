const List = require("../models/List");
const Recipient = require("../models/Recipient");

// Create a new list
const createList = async (req, res) => {
  try {
    const { name, description, tags } = req.body;

    // Check if list with same name already exists for this user
    const existingList = await List.findOne({
      name,
      user: req.user._id,
    });

    if (existingList) {
      return res.status(400).json({
        success: false,
        message: "List with this name already exists",
      });
    }

    // Create list
    const list = await List.create({
      name,
      description,
      tags,
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error creating list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create list",
      error: error.message,
    });
  }
};

// Get all lists for the authenticated user
const getLists = async (req, res) => {
  try {
    const lists = await List.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: lists.length,
      data: lists,
    });
  } catch (error) {
    console.error("Error fetching lists:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lists",
      error: error.message,
    });
  }
};

// Get a single list
const getList = async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error fetching list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch list",
      error: error.message,
    });
  }
};

// Update list
const updateList = async (req, res) => {
  try {
    const list = await List.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error updating list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update list",
      error: error.message,
    });
  }
};

// Delete list
const deleteList = async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Remove list from all recipients
    await Recipient.updateMany(
      { lists: list._id },
      { $pull: { lists: list._id } }
    );

    await list.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete list",
      error: error.message,
    });
  }
};

// Get recipients in a list
const getListRecipients = async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    // Get recipients in this list
    const recipients = await Recipient.find({
      lists: list._id,
      user: req.user._id,
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count
    const total = await Recipient.countDocuments({
      lists: list._id,
      user: req.user._id,
    });

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
    console.error("Error fetching list recipients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch list recipients",
      error: error.message,
    });
  }
};

// Add recipients to a list
const addRecipientsToList = async (req, res) => {
  try {
    const { recipientIds } = req.body;

    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of recipient IDs",
      });
    }

    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Add list to recipients
    const result = await Recipient.updateMany(
      {
        _id: { $in: recipientIds },
        user: req.user._id,
        lists: { $ne: list._id }, // Only update recipients not already in the list
      },
      { $addToSet: { lists: list._id } }
    );

    // Update list count
    list.recipientCount += result.nModified;
    await list.save();

    res.status(200).json({
      success: true,
      data: {
        added: result.nModified,
      },
    });
  } catch (error) {
    console.error("Error adding recipients to list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add recipients to list",
      error: error.message,
    });
  }
};

// Remove recipients from a list
const removeRecipientsFromList = async (req, res) => {
  try {
    const { recipientIds } = req.body;

    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of recipient IDs",
      });
    }

    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Remove list from recipients
    const result = await Recipient.updateMany(
      {
        _id: { $in: recipientIds },
        user: req.user._id,
        lists: list._id, // Only update recipients in the list
      },
      { $pull: { lists: list._id } }
    );

    // Update list count
    list.recipientCount -= result.nModified;
    if (list.recipientCount < 0) list.recipientCount = 0;
    await list.save();

    res.status(200).json({
      success: true,
      data: {
        removed: result.nModified,
      },
    });
  } catch (error) {
    console.error("Error removing recipients from list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove recipients from list",
      error: error.message,
    });
  }
};

module.exports = {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  getListRecipients,
  addRecipientsToList,
  removeRecipientsFromList,
};
