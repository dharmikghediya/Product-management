import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  DownloadCloud,
  Ear,
  ExternalLink,
  Headphones,
  Laptop,
  LoaderCircle,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react";
import {
  autoImportScrapedProducts,
  getScraperOffers,
  importScrapedProduct,
  saveScraperOffers,
  searchScraperProducts,
} from "../api/productsApi.js";
import ProductOffersField from "./ProductOffersField.jsx";
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  getCategoriesForRole,
  getOfferScopesForRole,
} from "../productUtils.js";

const CATEGORY_ICONS = {
  Mobile: Smartphone,
  Laptop: Laptop,
  Smartwatch: Watch,
  Earbuds: Ear,
  Headphones: Headphones,
};

const CATEGORY_CHIP_LABELS = {
  Mobile: "All Mobiles",
  Laptop: "All Laptops",
  Smartwatch: "All Smartwatches",
  Earbuds: "All Earbuds",
  Headphones: "All Headphones",
};

// Popular searches for each category, so a role only sees relevant chips.
const CATEGORY_SEARCH_CHIPS = {
  Mobile: ["iPhone 15", "Galaxy S24", "OnePlus 12"],
  Laptop: ["MacBook Pro", "Dell XPS", "Lenovo Legion"],
  Smartwatch: ["Apple Watch Series 9", "Galaxy Watch6", "Noise ColorFit"],
  Earbuds: ["Galaxy Buds3", "boAt Airdopes 141", "AirPods Pro"],
  Headphones: ["Sony WH-1000XM5", "JBL Tune 760NC", "boAt Rockerz 255"],
};

const SAVED_OFFERS_KEY = "product-management.scraper-offers";

// Keeps only the offers that belong to the scopes this role manages, so a
// draft saved by another role is never rewritten or removed here.
const readSavedOffers = (offerScopes = PRODUCT_CATEGORIES) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_OFFERS_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((offer) => offerScopes.includes(offer?.category))
      .slice(0, 3)
      .map((offer) => ({
        title: String(offer?.title || ""),
        description: String(offer?.description || ""),
        discountType: offer?.discountType === "fixed" ? "fixed" : "percentage",
        value: String(offer?.value ?? ""),
        minQuantity: String(offer?.minQuantity ?? 1),
        category: offer.category,
      }));
  } catch {
    return [];
  }
};

export default function AutoImportScraper({
  onProductsChanged,
  onNavigateToProducts,
  userRole = "",
}) {
  // Vendors only trade in wearables and audio gear, so their import page is
  // limited to those categories.
  const allowedCategories = useMemo(
    () => getCategoriesForRole(userRole),
    [userRole],
  );
  const isVendorScope = String(userRole || "").trim().toLowerCase() === "vendor";
  // Shared offers are kept per category: this role edits the offers of the
  // categories it trades in, and every other category keeps its own offer.
  const offerScopes = useMemo(
    () => getOfferScopesForRole(userRole),
    [userRole],
  );
  const categoryChips = allowedCategories.map(
    (name) => CATEGORY_CHIP_LABELS[name] || `All ${name}`,
  );

  const quickSearchChips = allowedCategories.flatMap(
    (name) => CATEGORY_SEARCH_CHIPS[name] || [],
  );

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoImporting, setIsAutoImporting] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [offers, setOffers] = useState(() => readSavedOffers(offerScopes));
  const [otherOffers, setOtherOffers] = useState([]);
  const [isSavingOffers, setIsSavingOffers] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_OFFERS_KEY, JSON.stringify(offers));
    } catch {
      // The explicit Save offer action reports storage failures to the admin.
    }
  }, [offers]);

  useEffect(() => {
    let isMounted = true;
    getScraperOffers().then((result) => {
      if (isMounted && Array.isArray(result.data) && result.data.length) {
        const saved = result.data.map((offer) => ({
          ...offer,
          value: String(offer.value ?? ""),
          minQuantity: String(offer.minQuantity ?? 1),
        }));
        // Offers of other categories stay untouched: they are only listed, never
        // edited here, and the server keeps them when this role saves.
        setOffers(saved.filter((offer) => offerScopes.includes(offer.category)));
        setOtherOffers(saved.filter((offer) => !offerScopes.includes(offer.category)));
      }
    }).catch((error) => {
      // Keep the browser-saved draft available and show when server persistence
      // could not be checked.
      if (isMounted) {
        setStatusMessage({
          type: "error",
          text: `Could not load saved offer settings from the server. ${error.message || "Check the API and database connection."}`,
        });
      }
    });
    return () => { isMounted = false; };
  }, [offerScopes]);

  const saveOffers = async () => {
    const isInvalid = offers.some((offer) => {
      const value = Number(offer.value);
      const minQuantity = Number(offer.minQuantity);
      return !String(offer.title || "").trim()
        || !Number.isFinite(value)
        || value <= 0
        || (offer.discountType === "percentage" && value > 100)
        || !Number.isInteger(minQuantity)
        || minQuantity < 1
        || minQuantity > 1000
        || !offerScopes.includes(offer.category || offerScopes[0] || "Mobile");
    });
    if (isInvalid) {
      setStatusMessage({ type: "error", text: "Complete each offer with a title, valid discount, and minimum quantity before saving." });
      return;
    }
    setIsSavingOffers(true);
    try {
      window.localStorage.setItem(SAVED_OFFERS_KEY, JSON.stringify(offers));
      await saveScraperOffers(offers.map((offer) => ({
        ...offer,
        value: Number(offer.value),
        minQuantity: Number(offer.minQuantity),
      })));
      setStatusMessage({ type: "success", text: "Offer settings saved and will stay available after refresh." });
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message || "Could not save offer settings." });
    } finally {
      setIsSavingOffers(false);
    }
  };

  const fetchResults = async (searchQuery = query, searchCategory = category) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await searchScraperProducts({
        query: searchQuery,
        category: searchCategory,
      });

       const allProducts = data.data || [];
       setResults(allProducts);
       setIsConfigured(data.scraperConfigured !== false);

      // Initialize default quantities
      const qMap = {};
      (data.data || []).forEach((item) => {
        qMap[item.id] = 10;
      });
      setQuantities((prev) => ({ ...qMap, ...prev }));
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to fetch products from scraper.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchResults("", "all");
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults(query, category);
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    fetchResults(query, selectedCategory);
  };

  const handleChipClick = (chipText) => {
    const chipCategory = allowedCategories.find(
      (name) => CATEGORY_CHIP_LABELS[name] === chipText,
    );

    if (chipCategory) {
      setQuery("");
      setCategory(chipCategory);
      fetchResults("", chipCategory);
      return;
    }

    setQuery(chipText);
    fetchResults(chipText, category);
  };

  const handleQuantityChange = (itemId, val) => {
    const num = Math.max(1, Math.min(999, parseInt(val, 10) || 1));
    setQuantities((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleSingleImport = async (item) => {
    setImportingId(item.id);
    setStatusMessage(null);
    try {
      const quantity = quantities[item.id] || 10;
      const res = await importScrapedProduct({
        title: item.title,
        brand: item.brand,
        model: item.model,
        price: item.price,
        category: item.category,
        description: item.description,
        image: item.image,
        sourceUrl: item.sourceUrl,
        merchant: item.merchant,
        quantity,
        offers,
      });

      // Mark as already imported in local state
      setResults((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, alreadyImported: true } : r)),
      );

      setStatusMessage({
        type: "success",
        text: `"${item.title}" successfully added to inventory with ${quantity} units!`,
      });

      onProductsChanged?.();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.message || `Failed to import "${item.title}".`,
      });
    } finally {
      setImportingId(null);
    }
  };

  const handleOneClickAutoImport = async () => {
    setIsAutoImporting(true);
    setStatusMessage(null);
    try {
      const res = await autoImportScrapedProducts({
        category,
        limit: 20,
        quantity: 10,
        offers,
      });

      setStatusMessage({
        type: "success",
        text: res.message || `Successfully auto-imported ${res.importedCount || 0} products!`,
      });

      // Refresh list to update "alreadyImported" flags
      await fetchResults(query, category);
      onProductsChanged?.();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to auto-import products.",
      });
    } finally {
      setIsAutoImporting(false);
    }
  };

  const handleImportAllVisible = async () => {
    const unimported = results.filter((r) => !r.alreadyImported);
    if (!unimported.length) return;

    setIsAutoImporting(true);
    setStatusMessage(null);
    let successCount = 0;

    for (const item of unimported) {
      try {
        const quantity = quantities[item.id] || 10;
        await importScrapedProduct({
          title: item.title,
          brand: item.brand,
          model: item.model,
          price: item.price,
          category: item.category,
          description: item.description,
          image: item.image,
          sourceUrl: item.sourceUrl,
          merchant: item.merchant,
          quantity,
          offers,
        });
        successCount += 1;
      } catch (err) {
        console.warn(`Failed visible import for ${item.title}:`, err.message);
      }
    }

    setStatusMessage({
      type: "success",
      text: `Successfully imported ${successCount} products into your inventory!`,
    });

    await fetchResults(query, category);
    onProductsChanged?.();
    setIsAutoImporting(false);
  };

  const unimportedCount = results.filter((r) => !r.alreadyImported).length;

  return (
    <div className="scraper-pipeline-container">
      {/* Hero 1-Click Banner */}
      <section className="scraper-hero-card" aria-label="1-Click Auto-Import">
        <div className="scraper-hero-content">
          <div className="scraper-badge-row">
            <span className="scraper-pill-badge">
              <Sparkles size={13} /> ScraperAPI Automated Pipeline
            </span>
            <span className="scraper-tag-badge">No Manual Entry Required</span>
          </div>
          <h2 className="scraper-hero-title">
            {isVendorScope
              ? "Auto-Import Smartwatches, Earbuds & Headphones to Inventory"
              : "Auto-Import Mobiles & Laptops to Inventory"}
          </h2>
          <p className="scraper-hero-desc">
            {isVendorScope
              ? "Instantly fetch specifications, verified brand names, realistic pricing, and high-res imagery for smartwatches, earbuds and headphones. Add them to stockroom with a single click."
              : "Instantly fetch specifications, verified brand names, realistic pricing, and high-res imagery for smartphones and laptops. Add them to stockroom with a single click."}
          </p>

          <div className="scraper-hero-actions">
            <button
              type="button"
              className="button button-primary scraper-main-btn"
              onClick={handleOneClickAutoImport}
              disabled={isAutoImporting || isLoading}
            >
              {isAutoImporting ? (
                <>
                  <LoaderCircle size={16} className="spinner" />
                  Auto-Importing Devices...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  1-Click Auto-Import 6 Trending Devices
                </>
              )}
            </button>

            {onNavigateToProducts && (
              <button
                type="button"
                className="button button-secondary"
                onClick={onNavigateToProducts}
              >
                View Inventory <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="scraper-offer-settings" aria-label="Offers for imported products">
        <ProductOffersField offers={offers} onChange={setOffers} disabled={isAutoImporting || Boolean(importingId) || isSavingOffers} onSaveOffer={saveOffers} showCategoryScope availableCategories={allowedCategories} />
        {statusMessage && (
          <div className={`scraper-status-banner ${statusMessage.type === "error" ? "is-error" : "is-success"}`} role="alert">
            {statusMessage.type === "error" ? <AlertCircle size={18} className="status-icon" /> : <Check size={18} className="status-icon" />}
            <span className="status-text">{statusMessage.text}</span>
            <button type="button" className="status-close-btn" onClick={() => setStatusMessage(null)} aria-label="Dismiss message">×</button>
          </div>
        )}
        <p>Saved offers apply to existing products without their own offer and to products imported from this page. A product-specific offer takes priority.</p>
        {otherOffers.length > 0 && (
          <p className="scraper-offer-shared-note">
            {otherOffers.length} offer{otherOffers.length === 1 ? "" : "s"} for other categories ({[...new Set(otherOffers.map((offer) => CATEGORY_LABELS[offer.category] || offer.category))].join(", ")}) stay active for shoppers and are kept when you save your own offers.
          </p>
        )}
        {onNavigateToProducts && <button className="button button-secondary" type="button" onClick={onNavigateToProducts}>Go to existing products</button>}
      </section>

      {/* Search and Category Control Bar */}
      <div className="scraper-filter-bar">
        {/* Category Pills */}
        <div className="scraper-category-toggles" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`scraper-toggle-btn ${category === "all" ? "active" : ""}`}
            onClick={() => handleCategorySelect("all")}
          >
            {isVendorScope ? "All" : "All Tech"}
          </button>
          {allowedCategories.map((name) => {
            const CategoryIcon = CATEGORY_ICONS[name] || Smartphone;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={category === name}
                className={`scraper-toggle-btn ${category === name ? "active" : ""}`}
                onClick={() => handleCategorySelect(name)}
              >
                <CategoryIcon size={15} /> {CATEGORY_LABELS[name] || name}
              </button>
            );
          })}
        </div>

        {/* Live Search Form */}
        <form className="scraper-search-form" onSubmit={handleSearchSubmit}>
          <div className="scraper-search-input-wrapper">
            <Search size={16} className="scraper-search-icon" />
            <input
              type="text"
              className="scraper-search-input"
              placeholder="Search a phone, laptop, watch, earbud or headphone (e.g. iPhone 15, XPS 15, Watch 9)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="scraper-clear-btn"
                onClick={() => {
                  setQuery("");
                  fetchResults("", category);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            className="button button-primary scraper-search-btn"
            disabled={isLoading}
          >
            {isLoading ? <LoaderCircle size={15} className="spinner" /> : <Search size={15} />}
            Search
          </button>

          <button
            type="button"
            className="button button-quiet"
            title="Refresh scraper catalog"
            onClick={() => fetchResults(query, category)}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? "spinner" : ""} />
          </button>
        </form>
      </div>

      {/* Quick Search Chips */}
      <div className="scraper-chips-row">
        <span className="scraper-chips-label">Popular Searches:</span>
        <div className="scraper-chips-list">
          {categoryChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="scraper-chip-button"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
          {quickSearchChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="scraper-chip-button"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="scraper-results-header">
        <div>
          <h3 className="scraper-results-title">
            Discovered Products ({results.length})
          </h3>
          <p className="scraper-results-subtitle">
            Preview scraped device specifications, select stock quantity, and import to your store.
          </p>
        </div>

        {unimportedCount > 1 && (
          <button
            type="button"
            className="button button-secondary scraper-batch-btn"
            onClick={handleImportAllVisible}
            disabled={isAutoImporting || isLoading}
          >
            <DownloadCloud size={15} />
            Import All Visible ({unimportedCount})
          </button>
        )}
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="scraper-loading-box">
          <LoaderCircle size={32} className="spinner scraper-loading-spinner" />
          <p>Fetching devices from ScraperAPI catalog...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="scraper-empty-box">
          <p>No products found matching your search. Try another brand or model keyword.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setQuery("");
              fetchResults("", category);
            }}
          >
            Reset Search
          </button>
        </div>
      ) : (
        <div className="scraper-cards-grid">
          {results.map((item) => {
            const isImportingThis = importingId === item.id;
            const currentQuantity = quantities[item.id] || 10;

            return (
              <article key={item.id} className="scraper-card">
                <div className="scraper-card-image-box">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="scraper-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="scraper-card-img-fallback"
                    style={{ display: item.image ? "none" : "flex" }}
                  >
                    {(() => {
                      const CategoryIcon = CATEGORY_ICONS[item.category] || Smartphone;
                      return <CategoryIcon size={36} />;
                    })()}
                  </div>

                  <div className="scraper-card-category-badge">
                    {(() => {
                      const CategoryIcon = CATEGORY_ICONS[item.category] || Smartphone;
                      return (
                        <>
                          <CategoryIcon size={12} /> {item.category || "Mobile"}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="scraper-card-body">
                  <div className="scraper-card-meta-row">
                    {item.brand && (
                      <span className="scraper-brand-pill">{item.brand}</span>
                    )}
                    {item.merchant && (
                      <span className="scraper-merchant-label">
                        Via {item.merchant}
                      </span>
                    )}
                  </div>

                  <h4 className="scraper-card-title" title={item.title}>
                    {item.title}
                  </h4>

                  {item.model && item.model !== item.title && (
                    <p className="scraper-card-model">
                      <strong>Model:</strong> {item.model}
                    </p>
                  )}

                  <div className="scraper-card-price-row">
                    <span className="scraper-card-price">
                      ₹{Number(item.price || 0).toLocaleString("en-IN")}
                    </span>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="scraper-source-link"
                        title="View original product page"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  <div className="scraper-card-action-row">
                    <div className="scraper-quantity-input-group">
                      <label htmlFor={`qty-${item.id}`} className="scraper-qty-label">
                        Stock:
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        min="1"
                        max="999"
                        className="scraper-qty-field"
                        value={currentQuantity}
                        disabled={item.alreadyImported || isImportingThis}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                      />
                    </div>

                    {item.alreadyImported ? (
                      <span className="scraper-imported-badge">
                        <Check size={14} /> In Inventory
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary scraper-import-btn"
                        onClick={() => handleSingleImport(item)}
                        disabled={isImportingThis || isAutoImporting}
                      >
                        {isImportingThis ? (
                          <>
                            <LoaderCircle size={14} className="spinner" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Import
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}

