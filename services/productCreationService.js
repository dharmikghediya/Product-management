const axios = require("axios");
const Product = require("../models/productModel");
const { normalizeProductCategory } = require("../config/productCategories");
const Counter = require("../models/counterModel");
const { broadcast } = require("../config/websocket");
const { AuditLogError, recordActivity } = require("./productActivityService");

const IMAGE_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const WIKIMEDIA_HOST = "upload.wikimedia.org";
const WIKIMEDIA_PATH_PREFIX = "/wikipedia/commons/";
const MAX_AUTOMATIC_PRODUCT_IMAGES = 5;
const MAX_PRODUCT_IMAGES_JSON_BYTES = 11_500_000;
const automaticImageCache = new Map();

const storeProductImage = async (image) => {
  if (typeof image !== "string" || !image.startsWith("https://")) return image;

  try {
    const imageUrl = new URL(image);
    const isWikimedia =
      imageUrl.hostname === WIKIMEDIA_HOST &&
      imageUrl.pathname.startsWith(WIKIMEDIA_PATH_PREFIX);

    const response = await axios.get(image, {
      responseType: "arraybuffer",
      timeout: IMAGE_TIMEOUT_MS,
      maxContentLength: MAX_IMAGE_BYTES,
    });

    const mimeType = String(response.headers["content-type"] || "")
      .split(";")[0]
      .toLowerCase();

    if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      if (isWikimedia) {
        throw new Error("The selected photo format is not supported.");
      }
      return image;
    }

    return `data:${mimeType};base64,${Buffer.from(response.data).toString("base64")}`;
  } catch (error) {
    if (error.message.includes("not supported")) {
      throw error;
    }
    // Return original image URL if fetch or conversion fails for non-Wikimedia images
    return image;
  }
};

const findProductImages = async (name, brand = "", model = "") => {
  const searchText = [brand, model]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .trim() || String(name || "").trim();

  if (!searchText) return [];

  try {
    const response = await axios.get(
      "https://commons.wikimedia.org/w/api.php",
      {
        params: {
          action: "query",
          generator: "search",
          gsrsearch: searchText,
          gsrnamespace: 6,
          gsrlimit: 10,
          prop: "imageinfo",
          iiprop: "url",
          iiurlwidth: 800,
          format: "json",
          formatversion: 2,
        },
        headers: {
          "User-Agent":
            "StockroomProductManagement/1.0 (product image lookup)",
        },
        timeout: 10000,
      },
    );

    const pages = response.data?.query?.pages || [];

    // Score against the identifying brand/model words instead of every word
    // in a long listing title (RAM, storage, marketing text, etc.).
    const relevanceText = [brand, model]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ")
      .trim() || String(name || "").trim();
    const terms = relevanceText
      .toLowerCase()
      .split(/[\s-]+/)
      .filter((term) => term.length > 2);

    const candidates = pages
      .map((page) => {
        const info = page.imageinfo?.[0];
        return {
          title: page.title || "",
          image: info?.thumburl || info?.url || "",
          sourcePage: info?.descriptionurl || "",
        };
      })
      .filter((item) => {
        if (!item.image || !item.sourcePage) return false;

        try {
          const imageUrl = new URL(item.image);
          const sourceUrl = new URL(item.sourcePage);

          return (
            imageUrl.protocol === "https:" &&
            imageUrl.hostname === WIKIMEDIA_HOST &&
            imageUrl.pathname.startsWith(WIKIMEDIA_PATH_PREFIX) &&
            sourceUrl.hostname === "commons.wikimedia.org" &&
            /\.(jpe?g|png|webp|gif)$/i.test(imageUrl.pathname)
          );
        } catch {
          return false;
        }
      })
      .map((item) => {
        const title = item.title.toLowerCase();
        const score = terms.filter((term) => title.includes(term)).length;
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    // Keep only reasonably close matches; Commons search can otherwise return
    // unrelated pictures for long or uncommon product names.
    return candidates
      .filter((candidate) => !terms.length || (candidate.score > 0 && candidate.score / terms.length >= 0.34))
      .filter((candidate, index, all) => all.findIndex((item) => item.image === candidate.image) === index)
      .slice(0, MAX_AUTOMATIC_PRODUCT_IMAGES)
      .map(({ image, sourcePage }) => ({ image, imageSource: sourcePage }));
  } catch (error) {
    console.error(
      "Automatic product image lookup failed:",
      error.response?.status || error.message,
    );

    // A failed image search must not stop product creation.
    return [];
  }
};

const findAmazonProductImages = async (sourceUrl, name = "", brand = "", model = "") => {
  const apiKey = process.env.SCRAPER_API_KEY_VALUE?.trim();
  if (!apiKey) return [];

  let asin = "";
  let productTld = process.env.SCRAPER_TLD || "in";
  try {
    if (typeof sourceUrl === "string" && sourceUrl) {
      const parsedUrl = new URL(sourceUrl);
      if (/(^|\.)amazon\.(in|com|co\.uk|ca|de|fr|it|es|co\.jp|com\.au)$/i.test(parsedUrl.hostname)) {
        productTld = parsedUrl.hostname.replace(/^www\./i, "").split("amazon.")[1];
        asin = parsedUrl.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1] || "";
      }
    }
  } catch {
    // A missing or non-Amazon source URL can still use product-name search.
  }
  const cacheKey = [productTld, asin || [brand, model, name].join(" ")].join(":").toLowerCase();
  const cached = automaticImageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.images;

  try {
    if (!asin) {
      const searchQuery = [brand, model].filter(Boolean).join(" ").trim() || String(name || "").trim();
      if (!searchQuery) return [];
      const searchResponse = await axios.get("https://api.scraperapi.com/structured/amazon/search", {
        params: {
          api_key: apiKey,
          query: searchQuery,
          country_code: ({ "co.uk": "gb", "co.jp": "jp", "com.au": "au" })[productTld]
            || process.env.SCRAPER_COUNTRY_CODE
            || "in",
          tld: productTld,
        },
        timeout: 20000,
      });
      const candidateRows = searchResponse.data?.shopping_results
        || searchResponse.data?.results
        || searchResponse.data?.items
        || searchResponse.data?.products
        || searchResponse.data?.organic_results
        || searchResponse.data?.data
        || [];
      const candidates = Array.isArray(candidateRows) ? candidateRows : [];
      const tokens = searchQuery.toLowerCase().split(/[\s-]+/).filter((token) => token.length > 2);
      const ranked = candidates.map((candidate) => {
        const title = String(candidate.title || candidate.name || "").toLowerCase();
        const matchedTerms = tokens.filter((token) => title.includes(token)).length;
        const candidateUrl = candidate.url || candidate.product_url || candidate.sourceUrl || candidate.link || "";
        const candidateAsin = String(candidate.asin || candidate.product_id || "").match(/^[A-Z0-9]{10}$/i)?.[0]
          || candidateUrl.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]
          || "";
        return { candidateAsin, score: tokens.length ? matchedTerms / tokens.length : 0 };
      }).filter((candidate) => candidate.candidateAsin && candidate.score >= 0.5)
        .sort((left, right) => right.score - left.score);
      asin = ranked[0]?.candidateAsin || "";
    }
    if (!asin) {
      automaticImageCache.set(cacheKey, { images: [], expiresAt: Date.now() + 60 * 60 * 1000 });
      return [];
    }

    const response = await axios.get("https://api.scraperapi.com/structured/amazon/product", {
      params: {
        api_key: apiKey,
        asin,
        country_code: ({ "co.uk": "gb", "co.jp": "jp", "com.au": "au" })[productTld] || productTld,
        tld: productTld,
      },
      timeout: 20000,
    });
    const images = Array.isArray(response.data?.images) ? response.data.images : [];
    const matches = [...new Set(images.filter((image) => typeof image === "string" && image.startsWith("https://")))]
      .slice(0, MAX_AUTOMATIC_PRODUCT_IMAGES)
      .map((image) => ({ image, imageSource: sourceUrl }));
    automaticImageCache.set(cacheKey, { images: matches, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return matches;
  } catch (error) {
    console.error("Amazon product image lookup failed:", error.response?.status || error.message);
    return [];
  }
};

const findProductVideos = async (name, brand = "", model = "") => {
  const searchText = [brand, model]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .trim() || String(name || "").trim();
  if (!searchText) return [];

  try {
    const response = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrsearch: `${searchText} filetype:video`,
        gsrnamespace: 6,
        gsrlimit: 12,
        prop: "imageinfo",
        iiprop: "url|mime",
        format: "json",
        formatversion: 2,
      },
      headers: { "User-Agent": "StockroomProductManagement/1.0 (product video lookup)" },
      timeout: 10000,
    });

    const terms = searchText.toLowerCase().split(/[\s-]+/).filter((term) => term.length > 2);
    return (response.data?.query?.pages || [])
      .map((page) => {
        const info = page.imageinfo?.[0];
        return { title: page.title || "", video: info?.url || "", sourcePage: info?.descriptionurl || "", mime: info?.mime || "" };
      })
      .filter((item) => {
        if (!item.video || !item.sourcePage || !/^video\/(mp4|webm|ogg|quicktime)$/i.test(item.mime)) return false;
        try {
          const videoUrl = new URL(item.video);
          const sourceUrl = new URL(item.sourcePage);
          return videoUrl.protocol === "https:"
            && videoUrl.hostname === WIKIMEDIA_HOST
            && videoUrl.pathname.startsWith(WIKIMEDIA_PATH_PREFIX)
            && sourceUrl.hostname === "commons.wikimedia.org";
        } catch {
          return false;
        }
      })
      .map((item) => ({ ...item, score: terms.filter((term) => item.title.toLowerCase().includes(term)).length }))
      .filter((item) => !terms.length || (item.score > 0 && item.score / terms.length >= 0.34))
      .sort((a, b) => b.score - a.score)
      .filter((item, index, all) => all.findIndex((candidate) => candidate.video === item.video) === index)
      .slice(0, 2)
      .map(({ video, sourcePage }) => ({ video, videoSource: sourcePage }));
  } catch (error) {
    console.error("Automatic product video lookup failed:", error.response?.status || error.message);
    return [];
  }
};

const findProductMedia = async (name, brand = "", model = "", sourceUrl = "") => {
  const [amazonImages, videos] = await Promise.all([
    findAmazonProductImages(sourceUrl, name, brand, model),
    findProductVideos(name, brand, model),
  ]);
  const supplementaryImages = amazonImages.length >= MAX_AUTOMATIC_PRODUCT_IMAGES
    ? []
    : await findProductImages(name, brand, model);
  const images = [...new Map([...amazonImages, ...supplementaryImages].map((item) => [item.image, item])).values()]
    .slice(0, MAX_AUTOMATIC_PRODUCT_IMAGES);
  return { images, videos };
};

// Retain the single-image helper for callers that only need a lead image.
const findProductImage = async (name, brand = "", model = "") =>
  (await findProductImages(name, brand, model))[0] || null;

const nextShelfLocation = async () => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      "shelfLocation",
      { $inc: { sequence: 1 } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    return String(counter.sequence).padStart(2, "0");
  } catch (error) {
    if (error.code !== 11000) throw error;
    const counter = await Counter.findByIdAndUpdate(
      "shelfLocation",
      { $inc: { sequence: 1 } },
      { returnDocument: "after" },
    );
    if (!counter) throw error;
    return String(counter.sequence).padStart(2, "0");
  }
};

const resolveProductImage = async ({
  image,
  images = [],
  imageSource,
  name,
  brand,
  model,
  sourceUrl,
}) => {
  const suppliedImages = [...new Set([
    ...(Array.isArray(images) ? images : []),
    image,
  ].filter((item) => typeof item === "string" && item.trim()))];
  const storedImages = [];
  const seenImages = new Set(suppliedImages);
  let totalBytes = 0;
  let resolvedImageSource = imageSource || "";

  for (const suppliedImage of suppliedImages) {
    try {
      const storedImage = await storeProductImage(suppliedImage);
      if (totalBytes + storedImage.length > MAX_PRODUCT_IMAGES_JSON_BYTES) continue;
      storedImages.push(storedImage);
      totalBytes += storedImage.length;
    } catch (error) {
      console.error("Could not store a supplied product photo:", error.message);
    }
  }

  // Keep product creation explicit: only photos supplied in the form are
  // saved with the product. Storefront media search is a separate read-only
  // action and must not add or alter products while they are being created.

  return {
    image: storedImages[0] || "",
    images: storedImages,
    imageSource: resolvedImageSource,
  };
};

const createProductRecord = async (req, values) => {
  const {
    name,
    brand = "",
    model = "",
    color = "",
    specifications = {},
    price,
    description,
    category,
    quantity,
    image = "",
    images = [],
    videos = [],
    offers = [],
    imageSource = "",
    source = "manual",
    sourceUrl,
  } = values;

  const resolvedImage = await resolveProductImage({
    image,
    images,
    imageSource,
    name,
    brand,
    model,
    sourceUrl,
  });

  const id = new Product()._id;
  const product = await Product.create({
    _id: id,
    name,
    brand,
    model,
    color,
    specifications,
    price,
    description,
    category: normalizeProductCategory(category) || category,
    quantity,
    image: resolvedImage.image,
    images: resolvedImage.images,
    videos,
    offers,
    imageSource: resolvedImage.imageSource,
    sku: `SKU-${id.toString().toUpperCase()}`,
    location: await nextShelfLocation(),
    source: source || "manual",
    ...(sourceUrl ? { sourceUrl } : {}),
  });

  try {
    await recordActivity(req, "Added Product", product);
  } catch (auditError) {
    throw new AuditLogError(auditError);
  }

  broadcast("product.created", product);
  return product;
};

module.exports = {
  createProductRecord,
  findProductImage,
  findProductImages,
  findAmazonProductImages,
  findProductMedia,
  findProductVideos,
  nextShelfLocation,
  resolveProductImage,
  storeProductImage,
};
