const ScraperOfferSettings = require("../models/scraperOfferSettingsModel");
const { getCategoriesForRole } = require("../config/productCategories");

// Each role manages the offers for the categories it trades in, so an admin
// and a vendor can each keep one offer per category without overwriting the
// other. "all" is a shared scope that every role can read and edit.
const getOfferScopesForRole = (role) => [...getCategoriesForRole(role), "all"];

const getOfferScope = (offer) => offer?.category || "Mobile";

const getDefaultProductOffers = async () => {
  const settings = await ScraperOfferSettings.findOne({ key: "default" }).lean();
  return Array.isArray(settings?.offers) ? settings.offers : [];
};

const getOffersForProduct = (product, defaultOffers = []) => {
  const productOffers = Array.isArray(product?.offers) ? product.offers : [];
  if (productOffers.length) return productOffers;
  return defaultOffers
    .filter((offer) => {
      const offerCategory = offer.category || "Mobile";
      return offerCategory === "all" || offerCategory === product?.category;
    })
    .map(({ category, ...offer }) => offer);
};

// Keeps the shared offers of every category the requester does not manage, so
// saving one category never removes the offers of another one.
const mergeOffersByScope = (storedOffers = [], incomingOffers = [], ownedScopes = []) => {
  const owned = new Set(ownedScopes);
  const kept = (Array.isArray(storedOffers) ? storedOffers : []).filter(
    (offer) => !owned.has(getOfferScope(offer)),
  );
  return [...kept, ...(Array.isArray(incomingOffers) ? incomingOffers : [])];
};

// Normalises submitted offers and drops the ones that are incomplete or that
// target a category the requester is not allowed to manage.
const sanitizeOffers = (drafts, allowedScopes = []) => {
  const offers = [];
  for (const item of Array.isArray(drafts) ? drafts : []) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const description = typeof item?.description === "string" ? item.description.trim() : "";
    const discountType =
      item?.discountType === "fixed" ? "fixed" : item?.discountType === "percentage" ? "percentage" : "";
    const value = Number(item?.value);
    const minQuantity = Number(item?.minQuantity ?? 1);
    const category = getOfferScope(item);
    if (!title || title.length > 60 || description.length > 180) continue;
    if (!discountType || !Number.isFinite(value) || value <= 0) continue;
    if (discountType === "percentage" && value > 100) continue;
    if (!Number.isInteger(minQuantity) || minQuantity < 1 || minQuantity > 1000) continue;
    if (!allowedScopes.includes(category)) continue;
    offers.push({ title, description, discountType, value, minQuantity, category });
  }
  return offers;
};

// `offers` stays the list stored on the product, while `displayOffers` is the
// list shoppers actually see: the product offer when it has one, otherwise the
// shared scraper offers that match the product category.
const withOfferViews = async (product, defaultOffers) => {
  const productData =
    typeof product?.toObject === "function"
      ? product.toObject()
      : { ...(product || {}) };

  const sharedOffers = defaultOffers || (await getDefaultProductOffers());

  return {
    ...productData,
    offers: Array.isArray(productData.offers) ? productData.offers : [],
    displayOffers: getOffersForProduct(productData, sharedOffers),
  };
};

module.exports = {
  getDefaultProductOffers,
  getOfferScope,
  getOfferScopesForRole,
  getOffersForProduct,
  mergeOffersByScope,
  sanitizeOffers,
  withOfferViews,
};
