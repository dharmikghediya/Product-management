const mongoose = require("mongoose");
const { PRODUCT_CATEGORIES } = require("../config/productCategories");

const productReviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: "Customer" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "", maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const productOfferSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: "", trim: true, maxlength: 180 },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true, min: 0.01 },
  minQuantity: { type: Number, default: 1, min: 1 },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    model: {
      type: String,
      default: "",
      trim: true,
    },
    color: { type: String, default: "", trim: true },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    reviews: { type: [productReviewSchema], default: [] },
    offers: { type: [productOfferSchema], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    imageSource: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    location: {
      type: String,
    },

    // Fields for imported products
    sourceUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    source: {
      type: String,
      enum: ["manual", "flipkart", "amazon", "scraper"],
      default: "manual",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate imports by source URL.
// Existing manual products without sourceUrl are unaffected.
productSchema.index(
  { sourceUrl: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceUrl: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Product", productSchema);
