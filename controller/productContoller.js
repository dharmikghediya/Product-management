const Product = require("../models/productModel");
const { broadcast } = require("../config/websocket");
const {
  AuditLogError,
  AUDITED_FIELDS,
  productSnapshot,
  recordActivity,
  sendAuditFailure,
} = require("../services/productActivityService");
const {
  createProductRecord,
  findAmazonProductImages,
  findProductImages,
  findProductMedia,
  nextShelfLocation,
  storeProductImage,
} = require("../services/productCreationService");
const { getDefaultProductOffers, withOfferViews } = require("../services/productOfferService");
const { getCategoriesForRole, normalizeProductCategory } = require("../config/productCategories");

// The admin workspace only lists products priced at or above this limit.
const ADMIN_PRODUCT_PRICE_LIMIT = 10000;

const addLegacyProductMetadata = async (products) =>
  Promise.all(
    products.map(async (product) => {
      const sku = product.sku || `SKU-${product._id.toString().toUpperCase()}`;
      if (!product.location) {
        const location = await nextShelfLocation();
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, location: { $in: [null, ""] } },
          { $set: { sku, location } },
          { returnDocument: "after" },
        );
        if (updated) return updated;

        const latest = await Product.findById(product._id);
        if (latest && !latest.sku) {
          latest.sku = sku;
          await latest.save();
        }
        return latest || product;
      }

      if (!product.sku) {
        product.sku = sku;
        await product.save();
      }
      return product;
    }),
  );

//create Product
const createProduct = async (req, res) => {
  try {
    const product = await createProductRecord(req, req.body);
    res.status(200).json({
      success: true,
      data: await withOfferViews(product),
      message: "Product created successfully",
    });
  } catch (error) {
    if (error instanceof AuditLogError) {
      return sendAuditFailure(res, error.cause, "addition");
    }
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

//update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (Array.isArray(updates.images)) {
      updates.images = await Promise.all(updates.images.map((image) => storeProductImage(image)));
      updates.image = updates.images[0] || "";
    } else if (updates.image) {
      updates.image = await storeProductImage(updates.image);
      updates.images = [updates.image];
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, data: null, message: "Product not found" });
    }

    const before = productSnapshot(existingProduct);
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    );
    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, data: null, message: "Product not found" });
    }

    const changedFields = AUDITED_FIELDS.filter(
      (field) => before[field] !== (updatedProduct[field] ?? null),
    );
    const action =
      changedFields.length === 1 && changedFields[0] === "quantity"
        ? "Updated Stock"
        : "Updated Product";

    try {
      await recordActivity(req, action, updatedProduct, before);
    } catch (auditError) {
      return sendAuditFailure(res, auditError, "update");
    }

    broadcast("product.updated", updatedProduct);
    res.status(200).json({
      success: true,
      data: await withOfferViews(updatedProduct),
      message: "Product updated successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

//get singleProduct
const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, data: null, message: "product not found" });
    }

    // A vendor only works with the categories they are allowed to trade in.
    const allowedCategories = getCategoriesForRole(req.user?.role);
    if (!allowedCategories.includes(product.category)) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "product not found",
      });
    }

    const defaultOffers = await getDefaultProductOffers();
    res.status(200).json({
      success: true,
      data: await withOfferViews(product, defaultOffers),
      message: "Product fetched successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

//get AllProducts
const getAllProducts = async (req, res) => {
  try {
    const allowedCategories = getCategoriesForRole(req.user?.role);
    const query = { category: { $in: allowedCategories } };
    // The admin workspace only tracks products priced at or above this limit.
    if (String(req.user?.role || "").trim().toLowerCase() === "admin") {
      query.price = { $gte: ADMIN_PRODUCT_PRICE_LIMIT };
    }
    const products = await addLegacyProductMetadata(await Product.find(query));
    const adminProducts = String(req.user?.role || "").trim().toLowerCase() === "admin"
      ? products.filter((product) => Number(product?.price) >= ADMIN_PRODUCT_PRICE_LIMIT)
      : products;
    const defaultOffers = await getDefaultProductOffers();
    res.status(200).json({
      success: true,
      data: await Promise.all(
        adminProducts.map((product) => {
          if (product && product.category) {
            product.category = normalizeProductCategory(product.category) || product.category;
          }
          return withOfferViews(product, defaultOffers);
        }),
      ),
      message: "Products fetched successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

//delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, data: null, message: "Product not found" });
    }

    try {
      const removedProduct = Object.fromEntries(
        AUDITED_FIELDS.map((field) => [field, null]),
      );
      await recordActivity(
        req,
        "Deleted Item",
        deletedProduct,
        productSnapshot(deletedProduct),
        removedProduct,
      );
    } catch (auditError) {
      return sendAuditFailure(res, auditError, "deletion");
    }

    broadcast("product.deleted", deletedProduct);

    res.status(200).json({
      success: true,
      data: null,
      message: "product deleted successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: null, message: error.message });
  }
};

const submitProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000) {
      return res.status(400).json({ success: false, message: "Choose a 1 to 5 star rating. Reviews can be up to 1,000 characters." });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const userId = String(req.user.sub);
    const existingReview = product.reviews.find((review) => review.userId === userId);
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.userName = req.user.name || "Customer";
      existingReview.createdAt = new Date();
    } else {
      product.reviews.push({ userId, userName: req.user.name || "Customer", rating, comment });
    }

    product.reviewCount = product.reviews.length;
    product.averageRating = product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviewCount;
    await product.save();
    broadcast("product.updated", product);
    return res.status(200).json({ success: true, data: await withOfferViews(product), message: "Your review was saved." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const searchProductImages = async (req, res) => {
  try {
    const { name = "", brand = "", model = "", sourceUrl = "" } = req.body || {};
    const validText = (value) => typeof value === "string" && value.length <= 200;
    if (![name, brand, model].every(validText) || typeof sourceUrl !== "string" || sourceUrl.length > 2048) {
      return res.status(400).json({ success: false, message: "Product name, brand, and model must be text under 200 characters." });
    }
    const [amazonImages, publicImages] = await Promise.all([
      findAmazonProductImages(sourceUrl, name, brand, model),
      findProductImages(name, brand, model),
    ]);
    const images = [...new Map([...amazonImages, ...publicImages].map((item) => [item.image, item])).values()].slice(0, 5);
    return res.status(200).json({ success: true, data: images, message: "Product photo matches found." });
  } catch (error) {
    return res.status(500).json({ success: false, data: [], message: error.message });
  }
};

const searchProductMedia = async (req, res) => {
  try {
    const { name = "", brand = "", model = "", sourceUrl = "" } = req.body || {};
    const validText = (value) => typeof value === "string" && value.length <= 200;
    if (![name, brand, model].every(validText) || typeof sourceUrl !== "string" || sourceUrl.length > 2048) {
      return res.status(400).json({ success: false, data: { images: [], videos: [] }, message: "Product name, brand, and model must be text under 200 characters." });
    }
    const media = await findProductMedia(name, brand, model, sourceUrl);
    return res.status(200).json({ success: true, data: media, message: "Matching product media found." });
  } catch (error) {
    return res.status(500).json({ success: false, data: { images: [], videos: [] }, message: error.message });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getAllProducts,
  getSingleProduct,
  deleteProduct,
  submitProductReview,
  searchProductImages,
  searchProductMedia,
};
