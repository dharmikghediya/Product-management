const Product = require("../models/productModel");
const ScraperOfferSettings = require("../models/scraperOfferSettingsModel");
const { createProductRecord } = require("../services/productCreationService");
const { withOfferViews } = require("../services/productOfferService");
const {
  getOfferScopesForRole,
  mergeOffersByScope,
  sanitizeOffers,
} = require("../services/productOfferService");
const {
  PRODUCT_CATEGORIES,
  getCategoriesForRole,
  getCategorySearchTerm,
  normalizeProductCategory,
} = require("../config/productCategories");
const {
  buildDescription,
  detectBrand,
  detectCategory,
  detectModel,
  hasValidScraperConfig,
  searchProducts,
} = require("../services/productScraperService");

const VALID_MARKETPLACES = ["amazon", "flipkart"];

const resolveScraperOffers = async (requestedOffers, role) => {
  const settings = await ScraperOfferSettings.findOne({ key: "default" }).lean();
  const stored = Array.isArray(settings?.offers) ? settings.offers : [];
  const scopes = getOfferScopesForRole(role);
  // Draft offers coming from the importer replace the saved offers of their
  // own category only, so the offers kept for other categories stay active.
  const requested = sanitizeOffers(requestedOffers, scopes).slice(0, 3);
  if (!requested.length) return stored;
  return mergeOffersByScope(stored, requested, scopes);
};

const offersForCategory = (offers, category) => (Array.isArray(offers) ? offers : [])
  .filter((offer) => {
    const offerCategory = offer.category || "Mobile";
    return offerCategory === "all" || offerCategory === category;
  })
  .map(({ category: _category, ...offer }) => offer);

const getMarketplace = (value) => {
  const marketplace = String(value || "amazon")
    .trim()
    .toLowerCase();

  if (!VALID_MARKETPLACES.includes(marketplace)) {
    throw new Error("Marketplace must be amazon or flipkart.");
  }

  return marketplace;
};

const getCategory = (value, allowedCategories = PRODUCT_CATEGORIES) => {
  const category = String(value || "all").trim();

  if (!["all", ...allowedCategories].includes(category)) {
    const error = new Error(
      `Category must be all, ${allowedCategories.join(", ")}.`,
    );
    error.statusCode = 400;
    throw error;
  }

  return category;
};

const findExistingProducts = async (items) => {
  const names = items.map((item) => item.title).filter(Boolean);
  const urls = items.map((item) => item.sourceUrl).filter(Boolean);

  if (!names.length && !urls.length) return [];

  const conditions = [];
  if (names.length) conditions.push({ name: { $in: names } });
  if (urls.length) conditions.push({ sourceUrl: { $in: urls } });

  return Product.find({ $or: conditions }).select("name sourceUrl").lean();
};

const annotateDuplicates = (items, existing) => {
  const names = new Set(
    existing.map((item) => item.name?.toLowerCase()).filter(Boolean),
  );

  const urls = new Set(existing.map((item) => item.sourceUrl).filter(Boolean));

  return items.map((item) => ({
    ...item,
    alreadyImported:
      names.has(item.title.toLowerCase()) ||
      Boolean(item.sourceUrl && urls.has(item.sourceUrl)),
  }));
};

const searchScraperProducts = async (req, res) => {
  try {
    console.log("SCRAPER SEARCH INPUT:", req.query);

    const query = String(req.query.query || req.query.q || "").trim();

    const allowedCategories = getCategoriesForRole(req.user?.role);
    const category = getCategory(req.query.category, allowedCategories);
    const marketplace = getMarketplace(req.query.marketplace);

    if (query.length === 1) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter at least 2 characters in the product search box.",
        receivedQuery: query,
      });
    }

    // Keep the rest of your existing function unchanged.

    if (!hasValidScraperConfig()) {
      return res.status(503).json({
        success: false,
        message: "ScraperAPI is not configured. Check your backend .env.",
      });
    }

    const results = await searchProducts(query, category, marketplace, allowedCategories);

    const existing = await findExistingProducts(results);
    const data = annotateDuplicates(results, existing);

    return res.status(200).json({
      success: true,
      count: data.length,
      marketplace,
      category,
      scraperConfigured: true,
      data,
    });
  } catch (error) {
    console.error("searchScraperProducts:", {
      message: error.message,
      query: req.query.query || req.query.q || "",
      marketplace: req.query.marketplace || "amazon",
    });

    return res.status(error.statusCode || 502).json({
      success: false,
      message: error.message || "Marketplace search failed.",
    });
  }
};

const importScrapedProduct = async (req, res) => {
  try {
    const {
      title,
      name,
      brand,
      model,
      price,
      category,
      description,
      image = "",
      imageSource = "",
      sourceUrl,
      merchant = "",
      quantity = 10,
      marketplace,
      offers: requestedOffers = [],
    } = req.body;

    const productName = String(title || name || "").trim();

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: "Product title is required.",
      });
    }

    const source = getMarketplace(marketplace);

    // The role decides which categories may be imported, so reject an
    // out-of-scope product before touching the database.
    const allowedCategories = getCategoriesForRole(req.user?.role);
    const rawCategory = category || detectCategory(productName);
    const validCategory =
      normalizeProductCategory(rawCategory) || detectCategory(productName);

    if (!allowedCategories.includes(validCategory)) {
      return res.status(400).json({
        success: false,
        message: `Your role can only import ${allowedCategories.join(", ")} products.`,
      });
    }

    // Only accept product URLs belonging to the selected marketplace.
    if (sourceUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid product URL.",
        });
      }

      const host = parsedUrl.hostname.toLowerCase();
      const validHost =
        source === "amazon"
          ? /(^|\.)amazon\.(in|com|co\.uk|ca|de|fr|it|es|co\.jp|com\.au)$/.test(
              host,
            )
          : host === "flipkart.com" || host.endsWith(".flipkart.com");

      if (parsedUrl.protocol !== "https:" || !validHost) {
        return res.status(400).json({
          success: false,
          message: "The product URL does not match the selected marketplace.",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "A valid marketplace product URL is required.",
      });
    }

    const existing = await Product.findOne({
      $or: [{ sourceUrl }, { name: productName }],
    }).select("_id");

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `"${productName}" is already in inventory.`,
      });
    }

    const detectedBrand = String(brand || detectBrand(productName)).trim();
    const detectedModel = String(
      model || detectModel(productName, detectedBrand),
    ).trim();

    const parsedPrice = Math.max(0, Math.round(Number(price) || 0));
    const parsedQuantity = Math.min(
      100000,
      Math.max(1, Math.round(Number(quantity) || 10)),
    );

    const productDescription =
      String(description || "").trim() ||
      buildDescription({
        title: productName,
        merchant,
        price: parsedPrice,
      });

    const offers = offersForCategory(await resolveScraperOffers(requestedOffers, req.productAccessUser?.role || req.user?.role), validCategory);

    const productData = {
      name: productName,
      brand: detectedBrand.slice(0, 60),
      model: detectedModel.slice(0, 60),
      price: parsedPrice,
      category: validCategory,
      quantity: parsedQuantity,
      description: productDescription,
      image: typeof image === "string" ? image : "",
      imageSource: imageSource || sourceUrl,
      source,
      sourceUrl,
      offers,
    };

    const createdProduct = await createProductRecord(req, productData);

    return res.status(201).json({
      success: true,
      data: await withOfferViews(createdProduct),
      message: `"${createdProduct.name}" imported successfully from ${source}.`,
    });
  } catch (error) {
    console.error("importScrapedProduct:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import product.",
    });
  }
};

const autoImportScraperProducts = async (req, res) => {
  try {
    const query = String(req.body.query || req.body.q || "").trim();

    const marketplace = getMarketplace(req.body.marketplace);
    const allowedCategories = getCategoriesForRole(req.user?.role);
    const category = getCategory(req.body.category, allowedCategories);

    const limit = Math.min(
      20,
      Math.max(1, Number.parseInt(req.body.limit, 10) || 6),
    );

    const quantity = Math.min(
      100000,
      Math.max(1, Number.parseInt(req.body.quantity, 10) || 10),
    );
    const offers = await resolveScraperOffers(req.body.offers, req.productAccessUser?.role || req.user?.role);

    const searchQuery =
      String(query || "").trim() ||
      `latest ${getCategorySearchTerm(category, allowedCategories)}`;

    if (searchQuery.length < 2) {
      const error = new Error(
        `Search query must contain at least 2 characters. Received: "${searchQuery}"`,
      );

      error.statusCode = 400;
      throw error;
    }
    if (!hasValidScraperConfig()) {
      return res.status(503).json({
        success: false,
        message: "ScraperAPI is not configured. Check your .env file.",
      });
    }

    console.log("Auto import request:", {
      query,
      marketplace,
      category,
      limit,
      quantity,
    });

    // Search products using the supplied query
    const candidates = await searchProducts(searchQuery, category, marketplace, allowedCategories);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(200).json({
        success: true,
        marketplace,
        query,
        importedCount: 0,
        failedCount: 0,
        data: [],
        failed: [],
        message: `No products found for "${query}" on ${marketplace}.`,
      });
    }

    const existing = await findExistingProducts(candidates);
    const annotated = annotateDuplicates(candidates, existing);

    const toImport = annotated
      .filter((item) => !item.alreadyImported && item.sourceUrl)
      .slice(0, limit);

    const importedProducts = [];
    const failed = [];

    for (const item of toImport) {
      try {
        const rawCategory = item.category || detectCategory(item.title);
        const validCategory =
          normalizeProductCategory(rawCategory) || detectCategory(item.title);

        const product = await createProductRecord(req, {
          name: item.title,
          brand: item.brand || detectBrand(item.title),
          model: item.model || detectModel(item.title, item.brand || ""),
          price: Math.max(0, Math.round(Number(item.price) || 0)),
          category: validCategory,
          quantity,
          description: buildDescription(item),
          image: item.image || "",
          imageSource: item.image || item.sourceUrl,
          source: marketplace,
          sourceUrl: item.sourceUrl,
          offers: offersForCategory(offers, validCategory),
        });

        importedProducts.push(product);
      } catch (error) {
        failed.push({
          title: item.title,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      marketplace,
      query,
      foundCount: candidates.length,
      importedCount: importedProducts.length,
      failedCount: failed.length,
      data: importedProducts,
      failed,
      message: `Imported ${importedProducts.length} product(s) from ${marketplace}.`,
    });
  } catch (error) {
    console.error("autoImportScraperProducts:", {
      message: error.message,
      query: req.body.query || req.body.q || "",
      marketplace: req.body.marketplace || "amazon",
    });

    return res.status(error.statusCode || 502).json({
      success: false,
      message: error.message || "Failed to import products.",
    });
  }
};

module.exports = {
  autoImportScraperProducts,
  importScrapedProduct,
  searchScraperProducts,
};
