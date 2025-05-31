const express = require("express");
const router = express.Router();
const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  setDefaultTemplate,
} = require("../controllers/templateController");
const { protect } = require("../middleware/auth");

// All template routes are protected
router.use(protect);

// Template routes
router.route("/").get(getTemplates).post(createTemplate);

router
  .route("/:id")
  .get(getTemplate)
  .put(updateTemplate)
  .delete(deleteTemplate);

router.post("/:id/clone", cloneTemplate);
router.post("/:id/default", setDefaultTemplate);

module.exports = router;
