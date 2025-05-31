const express = require("express");
const router = express.Router();
const {
  createRecipient,
  getRecipients,
  getRecipient,
  updateRecipient,
  deleteRecipient,
  bulkImportRecipients,
  getRecipientEmailHistory,
} = require("../controllers/recipientController");
const { protect } = require("../middleware/auth");

// All recipient routes are protected
router.use(protect);

// Recipient routes
router.route("/").get(getRecipients).post(createRecipient);

router.post("/import", bulkImportRecipients);

router
  .route("/:id")
  .get(getRecipient)
  .put(updateRecipient)
  .delete(deleteRecipient);

router.get("/:id/emails", getRecipientEmailHistory);

module.exports = router;
