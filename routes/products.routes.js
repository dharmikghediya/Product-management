const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  loadProductAccess,
  requireProductCreation,
  requireProductManagement,
  requireScraperAccess,
  restrictProductUpdateAccess,
} = require("../middleware/productAccess");
const { getActivityLog } = require("../controller/activityLogController");
const {
  createProduct,
  updateProduct,
  getSingleProduct,
  getAllProducts,
  deleteProduct,
  submitProductReview,
  searchProductImages,
  searchProductMedia,
} = require("../controller/productContoller");
const {
  searchScraperProducts,
  importScrapedProduct,
  autoImportScraperProducts,
} = require("../controller/scraperController");
const {
  registerFcmToken,
  sendPushNotification,
  getRegisteredTokens,
} = require("../config/firebase");
const { getScraperOffers, saveScraperOffers } = require("../controller/scraperOfferSettingsController");
const {
  validateProduct,
  validateProductUpdate,
  validateObjectId,
  validateFcmToken,
} = require("../models/product.validation");

router.post(
  "/createProduct",
  requireAuth,
  loadProductAccess,
  requireProductCreation,
  validateProduct,
  createProduct,
);
router.put(
  "/updateProduct/:id",
  requireAuth,
  loadProductAccess,
  restrictProductUpdateAccess,
  validateObjectId,
  validateProductUpdate,
  updateProduct,
);
router.get(
  "/getSingleProduct/:id",
  requireAuth,
  validateObjectId,
  getSingleProduct,
);
router.get("/getAllProducts", requireAuth, getAllProducts);
router.get("/scraper/offers", requireAuth, getScraperOffers);
router.put("/scraper/offers", requireAuth, loadProductAccess, requireProductCreation, saveScraperOffers);
// Read-only image lookup is available to signed-in shoppers as well as staff.
router.post("/images/search", requireAuth, searchProductImages);
router.post("/media/search", requireAuth, searchProductMedia);
router.post("/:id/reviews", requireAuth, requireRole("user"), validateObjectId, submitProductReview);
router.get("/activity", requireAuth, requireRole("admin"), getActivityLog);
router.delete(
  "/deleteProduct/:id",
  requireAuth,
  loadProductAccess,
  requireProductManagement,
  validateObjectId,
  deleteProduct,
);

// Scraper routes
router.get(
  "/scraper/search",
  requireAuth,
  loadProductAccess,
  requireScraperAccess,
  searchScraperProducts,
);
router.post(
  "/scraper/import",
  requireAuth,
  loadProductAccess,
  requireScraperAccess,
  importScrapedProduct,
);
router.post(
  "/scraper/auto-import",
  requireAuth,
  loadProductAccess,
  requireScraperAccess,
  autoImportScraperProducts,
);

router.post("/fcm/register-token", validateFcmToken, (req, res) => {
  const result = registerFcmToken(req.body.token);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

router.post("/fcm/test", async (req, res) => {
  const { token, title, body, data } = req.body;
  const result = await sendPushNotification({
    token: token || getRegisteredTokens()[0],
    title: title || "FCM Test",
    body: body || "This is a test notification from the product API.",
    data: data || { source: "product-api" },
  });

  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
});

module.exports = router;
