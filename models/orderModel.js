const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
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
    // Order photo snapshot can be uploaded independently of the catalog product.
    image: { type: String, default: "" },
    productColor: { type: String, default: "", trim: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    listPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    offerTitle: { type: String, default: "", trim: true, maxlength: 60 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      default: "Walk-in Customer",
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery",
    },
    deliveryAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    shippingStatus: {
      type: String,
      enum: ["not_shipped", "shipped", "in_transit", "out_for_delivery", "delivered"],
      default: "not_shipped",
    },
    trackingNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    currentLocation: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    estimatedDelivery: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      // `completed` remains readable for older records; new updates use `delivered`.
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "completed"],
      default: "pending",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: { type: Number, default: 0, min: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
