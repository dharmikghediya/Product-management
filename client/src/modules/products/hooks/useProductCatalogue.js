import { useCallback, useEffect, useMemo, useState } from "react";
import { LOW_STOCK_THRESHOLD, normalizeProductCategory, PRODUCT_CATEGORIES } from "../productUtils.js";

const PRODUCTS_PER_BATCH = 10;

export default function useProductCatalogue(products, allowedCategories = PRODUCT_CATEGORIES) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_BATCH);

  const categories = allowedCategories;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const compactSearch = normalizedSearch.replace(/[^a-z0-9]/g, "");
    return products.filter((product) => {
      const matchesCategory = category === "all" || normalizeProductCategory(product.category) === category;
       const searchableName = [
         product.name,
         product.brand,
         product.model,
         product.category,
       ].filter(Boolean).join(" ").toLowerCase();
      const compactName = searchableName.replace(/[^a-z0-9]/g, "");
      const matchesSearch = !normalizedSearch
        || searchableName.includes(normalizedSearch)
        || (compactSearch.length >= 2 && compactName.includes(compactSearch));
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;
      const matchesStatus = status === "all"
        || (status === "in-stock" && quantity >= LOW_STOCK_THRESHOLD)
        || (status === "low-stock" && quantity > 0 && quantity < LOW_STOCK_THRESHOLD)
        || (status === "out-of-stock" && quantity <= 0);
      const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
      const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);
      const matchesMinStock = minStock === "" || quantity >= Number(minStock);
      const matchesMaxStock = maxStock === "" || quantity <= Number(maxStock);
      return matchesCategory
        && matchesSearch
        && matchesStatus
        && matchesMinPrice
        && matchesMaxPrice
        && matchesMinStock
        && matchesMaxStock;
    });
  }, [category, maxPrice, maxStock, minPrice, minStock, products, search, status]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMoreProducts = visibleProducts.length < filteredProducts.length;

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_BATCH);
  }, [search, category, status, minPrice, maxPrice, minStock, maxStock, products]);

  const loadMoreProducts = useCallback(() => {
    setVisibleCount((count) => Math.min(count + PRODUCTS_PER_BATCH, filteredProducts.length));
  }, [filteredProducts.length]);
  const resetVisibleProducts = useCallback(() => setVisibleCount(PRODUCTS_PER_BATCH), []);

  const categorySummaries = useMemo(() => {
    return categories.map((name) => {
      const categoryProducts = products.filter((product) => normalizeProductCategory(product.category) === name);
      return {
        name,
        productCount: categoryProducts.length,
        units: categoryProducts.reduce(
          (total, product) => total + (Number(product.quantity) || 0),
          0,
        ),
        lowStockCount: categoryProducts.filter(
          (product) => Number(product.quantity) < LOW_STOCK_THRESHOLD,
        ).length,
      };
    });
  }, [categories, products]);

  const lowStockCount = products.filter(
    (product) => Number(product.quantity) < LOW_STOCK_THRESHOLD,
  ).length;
  const inventoryValue = products.reduce(
    (total, product) => total + Number(product.price || 0) * Number(product.quantity || 0),
    0,
  );

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setMinPrice("");
    setMaxPrice("");
    setMinStock("");
    setMaxStock("");
    setVisibleCount(PRODUCTS_PER_BATCH);
  };

  return {
    categories,
    categorySummaries,
    filteredProducts,
    visibleProducts,
    hasMoreProducts,
    loadMoreProducts,
    resetVisibleProducts,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minStock,
    setMinStock,
    maxStock,
    setMaxStock,
    resetFilters,
    lowStockCount,
    inventoryValue,
  };
}
