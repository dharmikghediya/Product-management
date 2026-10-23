const mongoose = require("mongoose");
const { PRODUCT_CATEGORIES } = require("../config/productCategories");

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: "", trim: true, maxlength: 180 },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true, min: 0.01 },
  minQuantity: { type: Number, default: 1, min: 1, max: 1000 },
  category: { type: String, enum: ["all", ...PRODUCT_CATEGORIES], default: "Mobile" },
}, { _id: false });

const scraperOfferSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "default" },
  offers: { type: [offerSchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("ScraperOfferSettings", scraperOfferSettingsSchema);
