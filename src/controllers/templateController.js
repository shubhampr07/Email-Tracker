const Template = require("../models/Template");

// Create a new template
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      content,
      category,
      variables,
      thumbnail,
    } = req.body;

    // Check if template with same name already exists for this user
    const existingTemplate = await Template.findOne({
      name,
      user: req.user._id,
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "Template with this name already exists",
      });
    }

    // Create template
    const template = await Template.create({
      name,
      description,
      subject,
      content,
      category: category || "custom",
      variables,
      thumbnail,
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create template",
      error: error.message,
    });
  }
};

// Get all templates for the authenticated user
const getTemplates = async (req, res) => {
  try {
    // Build query based on filters
    const query = {
      $or: [{ user: req.user._id }, { isSystem: true }],
    };

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    const templates = await Template.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
};

// Get a single template
const getTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { isSystem: true }],
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message,
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    // Don't allow updating system templates
    const template = await Template.findOne({
      _id: req.params.id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (template.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System templates cannot be modified",
      });
    }

    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this template",
      });
    }

    const updatedTemplate = await Template.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update template",
      error: error.message,
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (template.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System templates cannot be deleted",
      });
    }

    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this template",
      });
    }

    await template.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message,
    });
  }
};

// Clone a template
const cloneTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { isSystem: true }],
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Create a new template based on the existing one
    const newTemplate = await Template.create({
      name: `${template.name} (Copy)`,
      description: template.description,
      subject: template.subject,
      content: template.content,
      category: template.category,
      variables: template.variables,
      thumbnail: template.thumbnail,
      user: req.user._id,
      isSystem: false,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      data: newTemplate,
    });
  } catch (error) {
    console.error("Error cloning template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clone template",
      error: error.message,
    });
  }
};

// Set a template as default
const setDefaultTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Clear default flag from all other templates
    await Template.updateMany(
      { user: req.user._id, isDefault: true },
      { isDefault: false }
    );

    // Set this template as default
    template.isDefault = true;
    template.lastUsedAt = new Date();
    await template.save();

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error setting default template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set default template",
      error: error.message,
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  setDefaultTemplate,
};
