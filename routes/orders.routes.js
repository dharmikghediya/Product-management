const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { getOrders, getOrderById, createOrder, updateOrderStatus, updateShippingStatus, updateOrderItemImage } = require("../controller/orderController");

router.get("/", requireAuth, requireRole(["admin", "staff", "manager", "user"]), getOrders);
router.get("/:id", requireAuth, getOrderById);
router.post("/", requireAuth, requireRole(["staff", "manager", "user"]), createOrder);
router.patch("/:id/status", requireAuth, requireRole(["admin", "staff", "manager"]), updateOrderStatus);
router.patch("/:id/shipping", requireAuth, requireRole(["admin", "staff", "manager"]), updateShippingStatus);
router.patch("/:id/items/:itemIndex/image", requireAuth, requireRole(["admin", "staff", "manager"]), updateOrderItemImage);

module.exports = router;
