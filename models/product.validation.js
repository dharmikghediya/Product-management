const validator = require("validator");
const { PRODUCT_CATEGORIES, normalizeProductCategory } = require("../config/productCategories");

const productFields = [
  "name",
  "brand",
  "model",
  "color",
  "specifications",
  "price",
  "description",
  "category",
  "quantity",
  "image",
  "images",
  "videos",
  "imageSource",
  "offers",
];
const BRAND_MODEL_MAX_LENGTH = 60;


const parseNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || !validator.isFloat(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const validateProductPayload = (payload, isUpdate = false) => {
  const errors = [];
  const normalized = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { errors: ["Request body must be a JSON object."], normalized };
  }

  for (const field of Object.keys(payload)) {
    if (!productFields.includes(field)) {
      errors.push(`Unexpected field: ${field}.`);
    }
  }

  if (isUpdate && !productFields.some((field) => payload[field] !== undefined)) {
    errors.push("At least one product field must be provided.");
  }

  for (const field of productFields) {
    const value = payload[field];
    if (isUpdate && value === undefined) {
      continue;
    }
    if (!isUpdate && field === "images" && value === undefined) {
      normalized.images = [];
      continue;
    }
    if (!isUpdate && field === "videos" && value === undefined) {
      normalized.videos = [];
      continue;
    }
    if (!isUpdate && field === "offers" && value === undefined) {
      normalized.offers = [];
      continue;
    }
    if (!isUpdate && field === "color" && value === undefined) {
      normalized.color = "";
      continue;
    }
    if (!isUpdate && field === "specifications" && value === undefined) {
      continue;
    }

    if (field === "specifications") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push("specifications must be a name and value object.");
        continue;
      }
      const entries = Object.entries(value);
      if (entries.length > 30) {
        errors.push("Add no more than 30 product specifications.");
        continue;
      }
      const specifications = {};
      let specificationLength = 0;
      for (const [label, rawValue] of entries) {
        const normalizedLabel = label.trim();
        const normalizedValue = typeof rawValue === "string" || typeof rawValue === "number"
          ? String(rawValue).trim()
          : "";
        if (!normalizedLabel || normalizedLabel.length > 60 || normalizedValue.length > 200) {
          errors.push("Specification names must be 1–60 characters and values no more than 200 characters.");
          break;
        }
        specifications[normalizedLabel] = normalizedValue;
        specificationLength += normalizedLabel.length + normalizedValue.length;
      }
      if (specificationLength > 5000) {
        errors.push("Product specifications are too long.");
        continue;
      }
      normalized.specifications = specifications;
      continue;
    }

    if (field === "offers") {
      if (!Array.isArray(value) || value.length > 3) {
        errors.push("Add no more than 3 product offers.");
        continue;
      }
      const offers = [];
      for (const offer of value) {
        const title = typeof offer?.title === "string" ? offer.title.trim() : "";
        const description = typeof offer?.description === "string" ? offer.description.trim() : "";
        const discountType = offer?.discountType;
        const amount = Number(offer?.value);
        const minQuantity = Number(offer?.minQuantity ?? 1);
        if (!title || title.length > 60 || description.length > 180) {
          errors.push("Offer titles are required (up to 60 characters); descriptions may be up to 180 characters.");
          break;
        }
        if (!["percentage", "fixed"].includes(discountType) || !Number.isFinite(amount) || amount <= 0 || (discountType === "percentage" && amount > 100)) {
          errors.push("Offer discounts must be a positive fixed amount or a percentage up to 100.");
          break;
        }
        if (!Number.isInteger(minQuantity) || minQuantity < 1 || minQuantity > 1000) {
          errors.push("Offer minimum quantity must be from 1 to 1000.");
          break;
        }
        offers.push({ title, description, discountType, value: amount, minQuantity });
      }
      normalized.offers = offers;
      continue;
    }

    if (field === "image") {
      const image = value ?? "";
      const supportedImage = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
      let isValidImageUrl = false;
      if (typeof image === "string" && image.startsWith("https://")) {
        try {
          const imageUrl = new URL(image);
          isValidImageUrl = imageUrl.hostname.length > 0;
        } catch {}
      }
      if (typeof image !== "string" || image.length > 2_800_000 || (image !== "" && !supportedImage.test(image) && !isValidImageUrl)) {
        errors.push("image must be a PNG, JPEG, WebP, or GIF image, or an https image URL.");
        continue;
      }
      normalized.image = image;
      continue;
    }

    if (field === "images") {
      if (!Array.isArray(value) || value.length > 5) {
        errors.push("images must contain no more than 5 product photos.");
        continue;
      }
      const supportedImage = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
      const validImages = value.every((image) => {
        if (typeof image !== "string" || image.length > 2_800_000) return false;
        if (supportedImage.test(image)) return true;
        if (!image.startsWith("https://")) return false;
        try { return new URL(image).hostname.length > 0; } catch { return false; }
      });
      if (!validImages) {
        errors.push("Each product photo must be a PNG, JPEG, WebP, or GIF image, or an https image URL.");
        continue;
      }
      if (value.reduce((total, image) => total + image.length, 0) > 11_500_000) {
        errors.push("Product photos must be 8 MB or smaller in total.");
        continue;
      }
      normalized.images = value;
      continue;
    }

    if (field === "videos") {
      if (!Array.isArray(value) || value.length > 3) {
        errors.push("videos must contain no more than 3 product videos.");
        continue;
      }
      const supportedVideo = /^data:video\/(mp4|webm|quicktime);base64,[A-Za-z0-9+/]+={0,2}$/;
      const validVideos = value.every((video) => {
        if (typeof video !== "string" || video.length > 2_800_000) return false;
        if (supportedVideo.test(video)) return true;
        if (!video.startsWith("https://")) return false;
        try { return new URL(video).hostname.length > 0; } catch { return false; }
      });
      if (!validVideos) {
        errors.push("Each product video must be an MP4, WebM, or MOV video, or an https video URL, and no larger than 2 MB.");
        continue;
      }
      if (value.reduce((total, video) => total + video.length, 0) > 2_900_000) {
        errors.push("Product videos must be 2 MB or smaller in total.");
        continue;
      }
      normalized.videos = value;
      continue;
    }

    if (field === "imageSource") {
      const source = value ?? "";
      let isValidSource = source === "";
      if (typeof source === "string" && source.startsWith("https://")) {
        try {
          isValidSource = new URL(source).hostname.length > 0;
        } catch {}
      }
      if (typeof source !== "string" || source.length > 2048 || !isValidSource) {
        errors.push("imageSource must be an https URL.");
        continue;
      }
      normalized.imageSource = source;
      continue;
    }


    if (field === "brand" || field === "model") {
      const text = value === undefined || value === null ? "" : value;
      if (typeof text !== "string") {
        errors.push(`${field} must be a string.`);
        continue;
      }

      const trimmedText = text.trim();
      if (trimmedText.length > BRAND_MODEL_MAX_LENGTH) {
        errors.push(
          `${field} must be ${BRAND_MODEL_MAX_LENGTH} characters or fewer.`,
        );
        continue;
      }

      normalized[field] = trimmedText;
      continue;
    }

    if (field === "color") {
      if (typeof value !== "string" || value.trim().length > 40) {
        errors.push("color must be a string of 40 characters or fewer.");
        continue;
      }
      normalized.color = value.trim();
      continue;
    }

    if (field === "name" || field === "description" || field === "category") {
      if (typeof value !== "string") {
        errors.push(`${field} must be a string.`);
        continue;
      }

      const trimmed = value.trim();
      if (field === "category") {
        const normalizedCategory = normalizeProductCategory(trimmed);
        if (!normalizedCategory) {
          errors.push(`category must be one of ${PRODUCT_CATEGORIES.join(", ")}.`);
          continue;
        }
        normalized.category = normalizedCategory;
        continue;
      }

      const limits = field === "name"
        ? { min: 2, max: 100 }
        : { min: 10, max: 1000 };

      if (!validator.isLength(trimmed, limits)) {
        errors.push(`${field} must be between ${limits.min} and ${limits.max} characters.`);
        continue;
      }

      normalized[field] = trimmed;
      continue;
    }

    const parsed = parseNumber(value);
    if (parsed === null) {
      errors.push(`${field} must be a valid number.`);
      continue;
    }

    if (parsed < 0) {
      errors.push(`${field} must be non-negative.`);
      continue;
    }

    if (field === "quantity" && !Number.isInteger(parsed)) {
      errors.push("quantity must be an integer.");
      continue;
    }

    normalized[field] = parsed;
  }

  return { errors, normalized };
};

const validateProduct = (req, res, next) => {
  const { errors, normalized } = validateProductPayload(req.body, false);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.body = normalized;
  next();
};

const validateProductUpdate = (req, res, next) => {
  const { errors, normalized } = validateProductPayload(req.body, true);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.body = normalized;
  next();
};

const validateObjectId = (req, res, next) => {
  const { id } = req.params;

  if (!validator.isMongoId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  next();
};

const validateFcmToken = (req, res, next) => {
  const { token } = req.body;

  if (typeof token !== "string" || !validator.isLength(token.trim(), { min: 10, max: 4096 })) {
    return res.status(400).json({
      success: false,
      message: "FCM token is required and must be a valid string",
    });
  }

  next();
};

module.exports = {
  validateProduct,
  validateProductUpdate,
  validateProductPayload,
  validateObjectId,
  validateFcmToken,
};
