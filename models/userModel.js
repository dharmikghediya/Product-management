const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user", "vendor"],
      default: "user",
      required: true,
      trim: true,
      lowercase: true,
    },
    canManageProducts: { type: Boolean, default: false, required: true },
    passwordHash: { type: String, required: true, select: false },
    passwordSalt: { type: String, required: true, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
