const { promisify } = require("node:util");
const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const nodemailer = require("nodemailer");
const User = require("../models/userModel");
const { createAuthToken } = require("../middleware/auth");

const scryptAsync = promisify(scrypt);

async function hashPassword(password, salt) {
  return (await scryptAsync(password, salt, 64)).toString("hex");
}

async function verifyPassword(password, user) {
  const candidateHash = Buffer.from(await hashPassword(password, user.passwordSalt), "hex");
  const storedHash = Buffer.from(user.passwordHash, "hex");
  return candidateHash.length === storedHash.length && timingSafeEqual(candidateHash, storedHash);
}

async function initializeSuperAdmin({
  userModel = User,
  email = process.env.SUPER_ADMIN_EMAIL,
  password = process.env.SUPER_ADMIN_PASSWORD,
} = {}) {
  if (!email && !password) return false;
  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must both be configured.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const initialPassword = String(password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("SUPER_ADMIN_EMAIL must be a valid email address.");
  }
  if (initialPassword.length < 8 || initialPassword.length > 128) {
    throw new Error("SUPER_ADMIN_PASSWORD must be 8 to 128 characters.");
  }

  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.role !== "admin") {
      existingUser.role = "admin";
      existingUser.canManageProducts = false;
      await existingUser.save();
    }
    return false;
  }

  const passwordSalt = randomBytes(16).toString("hex");
  try {
    await userModel.create({
      name: "Super Admin",
      email: normalizedEmail,
      role: "admin",
      canManageProducts: false,
      passwordSalt,
      passwordHash: await hashPassword(initialPassword, passwordSalt),
    });
    return true;
  } catch (error) {
    if (error.code !== 11000) throw error;

    const concurrentlyCreatedUser = await userModel.findOne({ email: normalizedEmail });
    if (!concurrentlyCreatedUser) throw error;
    if (concurrentlyCreatedUser.role !== "admin") {
      concurrentlyCreatedUser.role = "admin";
      concurrentlyCreatedUser.canManageProducts = false;
      await concurrentlyCreatedUser.save();
    }
    return false;
  }
}

function sendSession(res, user, status = 200) {
  return res.status(status).json({
    success: true,
    token: createAuthToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      canManageProducts: user.canManageProducts === true,
    },
  });
}

function createMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function sendResetUnavailable(res) {
  return res.status(503).json({
    success: false,
    message: "Password reset email is unavailable. Contact your administrator.",
  });
}

const register = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Enter a name and a valid email address." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: "Password must be 8 to 128 characters." });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: "An account with this email already exists." });
  }

  const requestedRole = String(req.body.role || "user").trim().toLowerCase();
  const role = requestedRole === "vendor" ? "vendor" : "user";
  const passwordSalt = randomBytes(16).toString("hex");
  try {
    const user = await User.create({
      name,
      email,
      role,
      passwordSalt,
      passwordHash: await hashPassword(password, passwordSalt),
    });
    return res.status(201).json({
      success: true,
      message: "Account created. Sign in to continue.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role || "user" },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    throw error;
  }
}

const login = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email }).select("+passwordHash +passwordSalt");

  if (!user) {
    return res.status(401).json({ success: false, message: "Email or password is incorrect." });
  }
  if (!(await verifyPassword(password, user))) {
    return res.status(401).json({ success: false, message: "Email or password is incorrect." });
  }

  return sendSession(res, user);
}

const changePassword = async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ success: false, message: "Password must be 8 to 128 characters." });
  }

  const user = await User.findById(req.user.sub).select("+passwordHash +passwordSalt");
  if (!user || !(await verifyPassword(currentPassword, user))) {
    return res.status(401).json({ success: false, message: "Current password is incorrect." });
  }

  user.passwordSalt = randomBytes(16).toString("hex");
  user.passwordHash = await hashPassword(newPassword, user.passwordSalt);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return res.json({ success: true, message: "Password updated successfully." });
};

const requestPasswordReset = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const transport = createMailTransport();
  if (!transport || !process.env.SMTP_FROM) return sendResetUnavailable(res);

  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json(genericResponse);
  }

  const user = await User.findOne({ email });
  if (!user) return res.json(genericResponse);

  const resetToken = randomBytes(32).toString("hex");
  user.passwordResetTokenHash = createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = new URL(process.env.CLIENT_ORIGIN || "http://localhost:5173");
  resetUrl.searchParams.set("resetToken", resetToken);
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset your DG Tech Store password",
      text: `Use this link within one hour to reset your password: ${resetUrl.toString()}`,
    });
  } catch (error) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.error("Password reset email failed:", error.message);
    return sendResetUnavailable(res);
  }

  return res.json(genericResponse);
};

const resetPassword = async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: "Password must be 8 to 128 characters." });
  }
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ success: false, message: "This reset link is invalid or expired." });
  }

  const passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");
  if (!user) {
    return res.status(400).json({ success: false, message: "This reset link is invalid or expired." });
  }

  user.passwordSalt = randomBytes(16).toString("hex");
  user.passwordHash = await hashPassword(password, user.passwordSalt);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return res.json({ success: true, message: "Password updated. Sign in with your new password." });
};

module.exports = {
  register,
  login,
  changePassword,
  initializeSuperAdmin,
  requestPasswordReset,
  resetPassword,
};
