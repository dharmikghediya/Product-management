const User = require("../models/userModel");
const { createAuthToken } = require("../middleware/auth");
const { promisify } = require("node:util");
const { randomBytes, scrypt } = require("node:crypto");

const validRoles = ["admin", "staff", "user", "vendor"];
const scryptAsync = promisify(scrypt);

const createUser = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "user").trim().toLowerCase();

  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Enter a name and a valid email address.",
    });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Password must be 8 to 128 characters.",
    });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be one of admin, staff, user, or vendor.",
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await scryptAsync(password, passwordSalt, 64)).toString("hex");
    const user = await User.create({
      name,
      email,
      role,
      canManageProducts: false,
      passwordSalt,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canManageProducts: user.canManageProducts,
      },
      message: "User account created successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-passwordHash -passwordSalt -passwordResetTokenHash -passwordResetExpires")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users,
      message: "Users fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be one of admin, staff, user, or vendor.",
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (String(req.user.sub) === String(targetUser._id) && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot lower your own admin role.",
      });
    }

    targetUser.role = role;
    if (role === "admin" || role === "vendor") targetUser.canManageProducts = false;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      data: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        canManageProducts: targetUser.canManageProducts,
      },
      message: "User role updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const updateProductAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { canManageProducts } = req.body;
    if (typeof canManageProducts !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Product-management permission must be true or false.",
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    if (targetUser.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admins have read-only product access and cannot be granted product-management permission.",
      });
    }
    if (targetUser.role === "vendor" && canManageProducts) {
      return res.status(400).json({
        success: false,
        message: "Vendor access is limited to creating products and cannot include update or delete permission.",
      });
    }

    targetUser.canManageProducts = canManageProducts;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      data: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        canManageProducts: targetUser.canManageProducts,
      },
      message: canManageProducts
        ? "Product-management permission granted."
        : "Product-management permission revoked.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("-passwordHash -passwordSalt -passwordResetTokenHash -passwordResetExpires");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      token: createAuthToken(user),
      message: "Current user fetched successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUserRole,
  updateProductAccess,
  getCurrentUser,
  validRoles,
};
