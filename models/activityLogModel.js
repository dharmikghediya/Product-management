const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["Added Product", "Updated Product", "Updated Stock", "Deleted Item"],
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    changes: [
      {
        field: { type: String, required: true },
        before: { type: mongoose.Schema.Types.Mixed, default: null },
        after: { type: mongoose.Schema.Types.Mixed, default: null },
        _id: false,
      },
    ],
  },
  { versionKey: false },
);

activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
