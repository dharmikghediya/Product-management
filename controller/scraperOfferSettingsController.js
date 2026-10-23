const ScraperOfferSettings = require("../models/scraperOfferSettingsModel");
const { PRODUCT_CATEGORIES } = require("../config/productCategories");
const { getOfferScopesForRole, mergeOffersByScope } = require("../services/productOfferService");

const getScraperOffers = async (_req, res) => {
  try {
    const settings = await ScraperOfferSettings.findOne({ key: "default" }).lean();
    return res.status(200).json({ success: true, data: settings?.offers || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const saveScraperOffers = async (req, res) => {
  const allowedScopes = getOfferScopesForRole(req.productAccessUser?.role || req.user?.role);
  const incoming = req.body?.offers;
  const filteredIncoming = Array.isArray(incoming)
    ? incoming.filter((item) => {
        const title = typeof item?.title === "string" ? item.title.trim() : "";
        return title.length > 0;
      })
    : incoming;
  if (!Array.isArray(filteredIncoming) || filteredIncoming.length > 3) {
    return res.status(400).json({ success: false, message: "Add no more than 3 offers." });
  }

  const offers = [];
  for (const item of filteredIncoming) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const description = typeof item?.description === "string" ? item.description.trim() : "";
    const discountType = item?.discountType;
    const value = Number(item?.value);
    const minQuantity = Number(item?.minQuantity ?? 1);
    const category = item?.category || "Mobile";
    if (!title || title.length > 60 || description.length > 180) {
      return res.status(400).json({ success: false, message: "Offer title is required (up to 60 characters); description may be up to 180 characters." });
    }
    if (!["percentage", "fixed"].includes(discountType) || !Number.isFinite(value) || value <= 0 || (discountType === "percentage" && value > 100)) {
      return res.status(400).json({ success: false, message: "Discount must be a positive fixed amount or a percentage up to 100." });
    }
    if (!Number.isInteger(minQuantity) || minQuantity < 1 || minQuantity > 1000) {
      return res.status(400).json({ success: false, message: "Minimum quantity must be from 1 to 1000." });
    }
    if (category !== "all" && !PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Choose all categories or one of ${PRODUCT_CATEGORIES.join(", ")} for this offer.` });
    }
    // A role only owns the categories it trades in, so nobody can overwrite
    // the offer another team keeps for its own category.
    if (!allowedScopes.includes(category)) {
      return res.status(403).json({
        success: false,
        message: `You can only manage offers for ${allowedScopes.filter((scope) => scope !== "all").join(", ")}.`,
      });
    }
    offers.push({ title, description, discountType, value, minQuantity, category });
  }

  try {
    const stored = await ScraperOfferSettings.findOne({ key: "default" }).lean();
    // Only the scopes of this requester are replaced; the offers kept for the
    // other categories stay active for shoppers.
    const mergedOffers = mergeOffersByScope(stored?.offers, offers, allowedScopes);
    const settings = await ScraperOfferSettings.findOneAndUpdate(
      { key: "default" },
      { $set: { offers: mergedOffers, updatedBy: req.user.sub } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    return res.status(200).json({ success: true, data: settings.offers, message: "Scraper offer settings saved." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getScraperOffers, saveScraperOffers };
