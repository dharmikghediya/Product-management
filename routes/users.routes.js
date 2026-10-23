const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createUser,
  getUsers,
  updateUserRole,
  updateProductAccess,
  getCurrentUser,
} = require("../controller/userController");

router.get("/me", requireAuth, getCurrentUser);
// router.get("/users", requireAuth, requireRole("admin"), getUsers);
router.post("/", requireAuth, requireRole("admin"), createUser);
router.get("/", requireAuth, requireRole("admin"), getUsers);
router.patch("/:id/role", requireAuth, requireRole("admin"), updateUserRole);
router.patch("/:id/product-access", requireAuth, requireRole("admin"), updateProductAccess);
module.exports = router;
