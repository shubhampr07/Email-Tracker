const express = require("express");
const router = express.Router();
const {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  getListRecipients,
  addRecipientsToList,
  removeRecipientsFromList,
} = require("../controllers/listController");
const { protect } = require("../middleware/auth");

// All list routes are protected
router.use(protect);

// List routes
router.route("/").get(getLists).post(createList);

router.route("/:id").get(getList).put(updateList).delete(deleteList);

router.get("/:id/recipients", getListRecipients);
router.post("/:id/recipients", addRecipientsToList);
router.delete("/:id/recipients", removeRecipientsFromList);

module.exports = router;
