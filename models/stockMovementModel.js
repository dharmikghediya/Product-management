const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    movementType: {
      type: String,
      enum: ["stock_in", "stock_out", "order_sale", "order_cancel", "adjustment"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);
