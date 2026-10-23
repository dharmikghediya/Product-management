const express = require("express");
const { login, register, changePassword, requestPasswordReset, resetPassword } = require("../controller/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", requireAuth, changePassword);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

module.exports = router;