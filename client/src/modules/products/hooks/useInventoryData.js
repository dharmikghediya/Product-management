import { useCallback, useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct as removeProduct,
  getScraperOffers,
  listActivityLog,
  listProducts,
  submitProductReview as submitReviewRequest,
  updateProduct,
} from "../api/productsApi.js";
import { getProductId, normalizeProductCategory } from "../productUtils.js";

const normalizeProduct = (product) => ({
  ...product,
  category: normalizeProductCategory(product.category),
});

export default function useInventoryData(isEnabled, role = "") {
  const isAdmin = String(role || "").trim().toLowerCase() === "admin";
  const [products, setProducts] = useState([]);
  const [activityEntries, setActivityEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [connection, setConnection] = useState("checking");
  const [loadError, setLoadError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const loadProducts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [result, offerSettings] = await Promise.all([
        listProducts(),
        getScraperOffers().catch(() => ({ data: [] })),
      ]);
      const defaultOffers = Array.isArray(offerSettings.data) ? offerSettings.data : [];
      const normalizedProducts = Array.isArray(result.data) ? result.data.map((product) => normalizeProduct({
        ...product,
        // `offers` stays the list stored on the product so editing it never
        // pins a shared offer to the product; `displayOffers` is what shoppers see.
        offers: Array.isArray(product.offers) ? product.offers : [],
        displayOffers: Array.isArray(product.displayOffers) && product.displayOffers.length
          ? product.displayOffers
          : Array.isArray(product.offers) && product.offers.length
            ? product.offers
            : defaultOffers
              .filter((offer) => {
                const offerCategory = offer.category || "Mobile";
                return offerCategory === "all" || offerCategory === normalizeProductCategory(product.category);
              })
              .map(({ category: _category, ...offer }) => offer),
      })) : [];
      const visibleProducts = isAdmin
        ? normalizedProducts.filter((product) => Number(product.price) >= 10000)
        : normalizedProducts;
      setProducts(visibleProducts);
      setConnection("online");
      setLoadError("");
    } catch (error) {
      setConnection("offline");
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin]);

  const loadActivityLog = useCallback(async () => {
    setIsLoadingActivity(true);
    try {
      const result = await listActivityLog();
      setActivityEntries(Array.isArray(result.data) ? result.data : []);
      setActivityError("");
    } catch (error) {
      setActivityError(error.message);
    } finally {
      setIsLoadingActivity(false);
    }
  }, []);

  const submitProductReview = useCallback(async (product, review) => {
    const id = getProductId(product);
    const result = await submitReviewRequest(id, review);
    const savedProduct = normalizeProduct(result.data);
    setProducts((current) => current.map((item) =>
      getProductId(item) === id ? savedProduct : item
    ));
    return savedProduct;
  }, []);

  useEffect(() => {
    if (isEnabled) {
      loadProducts();
      loadActivityLog();
      return;
    }

    setProducts([]);
    setActivityEntries([]);
    setIsLoading(false);
    setIsLoadingActivity(false);
  }, [isEnabled, loadActivityLog, loadProducts]);

  
const saveProduct = useCallback(async (product, values) => {
  try {
    setFeedback(null);

    if (product) {
      const id = getProductId(product);
      const result = await updateProduct(id, values);

      setProducts((current) =>
        current.map((item) =>
          getProductId(item) === id
            ? normalizeProduct(result.data)
            : item
        ).filter((item) => !isAdmin || Number(item.price) >= 10000)
      );

      setFeedback({
        type: "success",
        message: "Product updated successfully.",
      });
    } else {
      const result = await createProduct(values);

      const createdProduct = normalizeProduct(result.data);
      setProducts((current) => {
        const next = [createdProduct, ...current];
        return isAdmin
          ? next.filter((item) => Number(item.price) >= 10000)
          : next;
      });

      setFeedback({
        type: "success",
        message: "Product created successfully.",
      });
    }

    // Activity-log refresh should not turn a successful save
    // into a failed save.
    try {
      await loadActivityLog();
    } catch (error) {
      console.error("Activity log refresh failed:", error);
    }
  } catch (error) {
    console.error("Save product error:", error);

    setFeedback({
      type: "error",
      message: error?.message || "Failed to save product.",
    });

    throw error;
  }
}, [loadActivityLog]);

  const deleteProduct = useCallback(async (product) => {
    const id = getProductId(product);
    await removeProduct(id);
    setProducts((current) => current.filter((item) => getProductId(item) !== id));
    await loadActivityLog();
    setFeedback({ type: "success", message: "Product deleted." });
  }, [loadActivityLog]);

  return {
    products,
    activityEntries,
    isLoading,
    isRefreshing,
    isLoadingActivity,
    connection,
    loadError,
    activityError,
    feedback,
    setFeedback,
    loadProducts,
    loadActivityLog,
    submitProductReview,
    saveProduct,
    deleteProduct,
  };
}
