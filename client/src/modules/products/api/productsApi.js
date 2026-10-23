
const API_ROOT = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Common API request function
export async function apiRequest(path, options = {}) {
  let session = null;

  try {
    session = JSON.parse(
      localStorage.getItem("stockroom-session") || "null"
    );
  } catch {
    localStorage.removeItem("stockroom-session");
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      ...(options.body && !options.headers?.["Content-Type"]
        ? { "Content-Type": "application/json" }
        : {}),
      ...(session?.token && !options.headers?.Authorization
        ? { Authorization: `Bearer ${session.token}` }
        : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error("The API returned an invalid response.");
      }
    }
  }

  const isProtectedApiPath = [
    "/product/",
    "/users",
    "/orders",
    "/stock-movements",
    "/auth/change-password",
  ].some((prefix) => path.startsWith(prefix));

  if (response.status === 401 && isProtectedApiPath) {
    localStorage.removeItem("stockroom-session");
    window.dispatchEvent(new Event("stockroom:unauthorized"));
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.errors?.join(" ") ||
        result.message ||
        `The request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

// Get all products
export function listProducts() {
  return apiRequest("/product/getAllProducts");
}

export function getScraperOffers() {
  return apiRequest("/product/scraper/offers");
}

export function saveScraperOffers(offers) {
  return apiRequest("/product/scraper/offers", {
    method: "PUT",
    body: JSON.stringify({ offers }),
  });
}

export function submitProductReview(id, { rating, comment }) {
  return apiRequest(`/product/${encodeURIComponent(id)}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

// Get product activity log
export function listActivityLog() {
  return apiRequest("/product/activity");
}

// Convert a File/Blob to a base64 data URL so it can be sent as JSON.
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

// Create a product manually
export async function createProduct(values) {
  const payload = { ...values };
  if (payload.image instanceof File || payload.image instanceof Blob) {
    payload.image = await fileToDataUrl(payload.image);
  }
  return apiRequest("/product/createProduct", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update an existing product
export function updateProduct(id, values) {
  return apiRequest(
    `/product/updateProduct/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(values),
    }
  );
}

export function searchProductImages({ name = "", brand = "", model = "" } = {}) {
  return apiRequest("/product/images/search", {
    method: "POST",
    body: JSON.stringify({ name, brand, model }),
  });
}

export function searchProductMedia({ name = "", brand = "", model = "", sourceUrl = "" } = {}) {
  // Use the established image-search route for storefronts, including on
  // deployments that have not yet installed the newer media route.
  return apiRequest("/product/images/search", {
    method: "POST",
    body: JSON.stringify({ name, brand, model, sourceUrl }),
  }).then((result) => ({
    ...result,
    data: {
      images: Array.isArray(result.data) ? result.data : result.data?.images || [],
      videos: Array.isArray(result.data?.videos) ? result.data.videos : [],
    },
  }));
}

// Delete a product
export function deleteProduct(id) {
  return apiRequest(
    `/product/deleteProduct/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

// Search products from Amazon or Flipkart
export function searchScraperProducts({
  query = "",
  category = "all",
  marketplace = "amazon",
} = {}) {
  const trimmedQuery = String(query).trim();

  if (trimmedQuery.length === 1) {
    throw new Error(
      "Please enter at least 2 characters to search."
    );
  }

  const params = new URLSearchParams({
    query: trimmedQuery,
    category,
    marketplace,
  });

  return apiRequest(
    `/product/scraper/search?${params.toString()}`
  );
}

// Import one selected scraped product
export function importScrapedProduct(productData) {
  return apiRequest("/product/scraper/import", {
    method: "POST",
    body: JSON.stringify(productData),
  });
}

// Automatically import multiple scraped products
export function autoImportScrapedProducts({
  query = "",
  category = "all",
  marketplace = "amazon",
  limit = 6,
  quantity = 10,
  offers = [],
} = {}) {
  const trimmedQuery = String(query).trim();

  if (trimmedQuery.length === 1) {
    throw new Error(
      "Please enter at least 2 characters to import."
    );
  }

  return apiRequest("/product/scraper/auto-import", {
    method: "POST",
    body: JSON.stringify({
      query: trimmedQuery,
      category,
      marketplace,
      limit,
      quantity,
      offers,
    }),
  });
}
