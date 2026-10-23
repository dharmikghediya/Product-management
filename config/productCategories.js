const PRODUCT_CATEGORIES = [
  "Mobile",
  "Laptop",
  "Smartwatch",
  "Earbuds",
  "Headphones",
];

// Vendors only supply wearables and audio gear, so their scraper imports are
// limited to these categories.
const VENDOR_CATEGORIES = ["Smartwatch", "Earbuds", "Headphones"];

const CATEGORY_ALIASES = {
  mobile: "Mobile",
  "mobile phone": "Mobile",
  smartphone: "Mobile",
  phone: "Mobile",
  laptop: "Laptop",
  notebook: "Laptop",
  smartwatch: "Smartwatch",
  "smart watch": "Smartwatch",
  watch: "Smartwatch",
  wearable: "Smartwatch",
  earbuds: "Earbuds",
  "ear buds": "Earbuds",
  "ear-buds": "Earbuds",
  earbud: "Earbuds",
  earphone: "Earbuds",
  earphones: "Earbuds",
  "in-ear": "Earbuds",
  "in ear": "Earbuds",
  tws: "Earbuds",
  "true wireless earbuds": "Earbuds",
  headphone: "Headphones",
  headphones: "Headphones",
  "head phones": "Headphones",
  headset: "Headphones",
};

// Maps any accepted spelling of a category to its canonical name.
// Returns null when the value does not match a known category.
const normalizeProductCategory = (value) => {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_ALIASES[key] || null;
};

const isProductCategory = (value) => PRODUCT_CATEGORIES.includes(value);

// Default search term used when browsing a category without a search query.
const CATEGORY_SEARCH_TERMS = {
  Mobile: "smartphones",
  Laptop: "laptops",
  Smartwatch: "smartwatches",
  Earbuds: "earbuds",
  Headphones: "headphones",
};

const getCategoriesForRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "vendor") return VENDOR_CATEGORIES;
  if (normalizedRole === "admin")
    return PRODUCT_CATEGORIES.filter((category) => !VENDOR_CATEGORIES.includes(category));
  return PRODUCT_CATEGORIES;
};

const getCategorySearchTerm = (category, categories = PRODUCT_CATEGORIES) =>
  CATEGORY_SEARCH_TERMS[category] ||
  categories
    .map((name) => CATEGORY_SEARCH_TERMS[name])
    .filter(Boolean)
    .join(" ");

module.exports = {
  CATEGORY_ALIASES,
  CATEGORY_SEARCH_TERMS,
  PRODUCT_CATEGORIES,
  VENDOR_CATEGORIES,
  getCategoriesForRole,
  getCategorySearchTerm,
  isProductCategory,
  normalizeProductCategory,
};
