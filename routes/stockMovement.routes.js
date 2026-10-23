const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { getStockMovements, createStockMovement } = require("../controller/stockMovementController");

router.get("/", requireAuth, requireRole(["admin", "staff", "manager"]), getStockMovements);
router.post("/", requireAuth, requireRole(["admin", "staff", "manager"]), createStockMovement);

module.exports = router;
