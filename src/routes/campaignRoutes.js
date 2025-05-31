const express = require("express");
const router = express.Router();
const {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignStats,
} = require("../controllers/campaignController");
const { protect } = require("../middleware/auth");

// All campaign routes are protected
router.use(protect);

// Campaign routes
router.route("/").get(getCampaigns).post(createCampaign);

router
  .route("/:id")
  .get(getCampaign)
  .put(updateCampaign)
  .delete(deleteCampaign);

router.post("/:id/send", sendCampaign);
router.get("/:id/stats", getCampaignStats);

module.exports = router;
