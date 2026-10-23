export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const LOW_STOCK_THRESHOLD = 5;

export const PRODUCT_CATEGORIES = [
  "Mobile",
  "Laptop",
  "Smartwatch",
  "Earbuds",
  "Headphones",
];

export const CATEGORY_LABELS = {
  Mobile: "Mobiles",
  Laptop: "Laptops",
  Smartwatch: "Smartwatches",
  Earbuds: "Earbuds",
  Headphones: "Headphones",
};

// Vendors only supply wearables and audio gear.
export const VENDOR_CATEGORIES = ["Smartwatch", "Earbuds", "Headphones"];

export const getCategoriesForRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "vendor") return VENDOR_CATEGORIES;
  if (normalizedRole === "admin")
    return PRODUCT_CATEGORIES.filter((category) => !VENDOR_CATEGORIES.includes(category));
  return PRODUCT_CATEGORIES;
};

// Shared offers are kept per category, so every role manages the offers of the
// categories it trades in plus the shared "all products" scope.
export const getOfferScopesForRole = (role) => [...getCategoriesForRole(role), "all"];

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
  earbud: "Earbuds",
  earphone: "Earbuds",
  earphones: "Earbuds",
  "in-ear": "Earbuds",
  tws: "Earbuds",
  headphone: "Headphones",
  headphones: "Headphones",
  headset: "Headphones",
};

export function normalizeProductCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
  return String(category || "").trim();
}

export function getProductId(product) {
  return product._id || product.id;
}
