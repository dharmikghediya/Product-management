
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CirclePlus,
  LoaderCircle,
  Minus,
  PackageOpen,
  Pencil,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import {
  currency,
  getProductId,
  LOW_STOCK_THRESHOLD,
} from "../productUtils.js";
import { calculateProductOffer, formatOfferDiscount, getDisplayOffers } from "../offerUtils.js";

export default function ProductCatalogue({
  products = [],
  filteredProducts = [],
  visibleProducts = [],
  categories = [],
  search = "",
  onSearchChange,
  category = "all",
  onCategoryChange,
  status = "all",
  onStatusChange,
  minPrice = "",
  onMinPriceChange,
  maxPrice = "",
  onMaxPriceChange,
  minStock = "",
  onMinStockChange,
  maxStock = "",
  onMaxStockChange,
  onResetFilters,
  isRefreshing = false,
  onRefresh,
  feedback,
  onDismissFeedback,
  loadError,
  onRetry,
  isLoading = false,
  canManageProducts = true,
  canEditProducts = canManageProducts,
  canCreateProducts = false,
  canLogStockMovement = true,
  canPurchase = false,
  onAddToCart,
  onBuyNow,
  onCartQuantityChange,
  onRemoveFromCart,
  cartItems = [],
  onEdit,
  onDelete,
  onOpenProduct,
  onCreate,
  onLogStockMovement,
  isStorefront = false,
  connection,
  hasMoreProducts = false,
  onLoadMore,
}) {
  const loadMoreRef = useRef(null);
  const safeProducts = Array.isArray(products) ? products : [];
  const safeFilteredProducts = Array.isArray(filteredProducts)
    ? filteredProducts
    : [];
  const safeVisibleProducts = Array.isArray(visibleProducts)
    ? visibleProducts
    : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreProducts || !onLoadMore || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin: "400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, onLoadMore]);

  const getCartCount = (product) => {
    const productId = getProductId(product);
    if (!productId) return 0;
    const item = safeCartItems.find(
      (cartItem) => getProductId(cartItem) === productId,
    );
    return item ? Number(item.quantity) || 0 : 0;
  };

  const [isAdding, setIsAdding] = useState({});
  const ADDING_MS = 420;

  const handleAddToCart = (product) => {
    const productId = getProductId(product);
    if (!productId) return;
    setIsAdding((current) => ({ ...current, [productId]: true }));
    onAddToCart?.(product);
    window.setTimeout(() => {
      setIsAdding((current) => ({ ...current, [productId]: false }));
    }, ADDING_MS);
  };

  const renderCartAction = (product) => {
    const productId = getProductId(product);
    const quantity = getCartCount(product);
    const stock = Math.max(0, Number(product.quantity) || 0);

    if (quantity > 0) {
      return (
        <div className="catalogue-cart-controls" aria-label={`Cart quantity for ${product.name}`}>
          <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => onCartQuantityChange?.(productId, quantity - 1)} disabled={quantity <= 1}><Minus size={16} /></button>
          <strong aria-live="polite">{quantity}</strong>
          <button type="button" aria-label={`Add one ${product.name}`} onClick={() => onCartQuantityChange?.(productId, quantity + 1)} disabled={quantity >= stock}><span aria-hidden="true">+</span></button>
          <button className="catalogue-cart-remove" type="button" aria-label={`Remove ${product.name} from cart`} onClick={() => onRemoveFromCart?.(productId)}><Trash2 size={15} /></button>
        </div>
      );
    }

    return (
      <button
        className={`button button-primary button-grow ${isAdding[productId] ? "is-adding" : ""}`}
        type="button"
        disabled={stock <= 0}
        onClick={() => handleAddToCart(product)}
      >
        <ShoppingCart size={15} /> Add to cart
      </button>
    );
  };

  const lowStockProducts = safeProducts.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) < LOW_STOCK_THRESHOLD,
  ).length;

  const outOfStockProducts = safeProducts.filter(
    (product) => Number(product.quantity) <= 0,
  ).length;

  const inStockProducts =
    safeProducts.length - lowStockProducts - outOfStockProducts;

  return (
    <section
      id="products"
      className="catalogue"
      aria-labelledby="catalogue-title"
      tabIndex={-1}
    >
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={13} />{" "}
            {isStorefront ? "SHOP THE COLLECTION" : "INVENTORY FILTERS"}
          </span>
          <h2 id="catalogue-title">
            {isStorefront ? "All products" : "Manage products"}
          </h2>
          <p>
            {isStorefront
              ? "Browse our products and add them to your cart."
              : "Filter, edit, and track your stock in one place."}
          </p>
        </div>

        {isStorefront && canCreateProducts && (
          <div className="catalogue-heading-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={onCreate}
            >
              <CirclePlus size={15} /> Add product
            </button>
          </div>
        )}
      </div>

      {!isStorefront && (
        <div className="catalogue-summary" aria-label="Product stock summary">
          <div>
            <span>Total products</span>
            <strong>{safeProducts.length}</strong>
          </div>
          <div>
            <span>In stock</span>
            <strong>{inStockProducts}</strong>
          </div>
          <div>
            <span>Low stock</span>
            <strong>{lowStockProducts}</strong>
          </div>
          <div>
            <span>Out of stock</span>
            <strong>{outOfStockProducts}</strong>
          </div>
        </div>
      )}

      <div className="catalogue-filter-panel" aria-label="Product filters">
        <label className="catalogue-filter-field">
          <span>Product</span>
          <div className="catalogue-filter-input-wrap">
            <Search size={15} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search product name"
            />
          </div>
        </label>

        <label className="catalogue-filter-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => onCategoryChange?.(event.target.value)}
          >
            <option value="all">All categories</option>
            {safeCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="catalogue-filter-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange?.(event.target.value)}
          >
            <option value="all">All</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>

        <label className="catalogue-filter-field">
          <span>Minimum price</span>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => onMinPriceChange?.(event.target.value)}
            placeholder="₹ Min"
          />
        </label>

        <label className="catalogue-filter-field">
          <span>Maximum price</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => onMaxPriceChange?.(event.target.value)}
            placeholder="₹ Max"
          />
        </label>

        {!isStorefront && (
          <>
            <label className="catalogue-filter-field">
              <span>Minimum stock</span>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(event) => onMinStockChange?.(event.target.value)}
                placeholder="Min units"
              />
            </label>

            <label className="catalogue-filter-field">
              <span>Maximum stock</span>
              <input
                type="number"
                min="0"
                value={maxStock}
                onChange={(event) => onMaxStockChange?.(event.target.value)}
                placeholder="Max units"
              />
            </label>
          </>
        )}

        <div className="catalogue-filter-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onResetFilters}
          >
            Reset
          </button>

          {!isStorefront && (
            <>
              <button
                className="button button-secondary"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "refresh-spinner" : undefined}
                />
                Refresh
              </button>

              {canLogStockMovement && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={onLogStockMovement}
                >
                  Stock movement
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {loadError && (
        <div className="catalogue-feedback error" role="alert">
          <AlertCircle size={16} />
          <span>{loadError}</span>
          <button
            className="button button-secondary"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {isStorefront ? (
        <div className="store-product-grid">
          {isLoading ? (
            <div className="store-product-message">
              <LoaderCircle className="spinner" size={18} />
              Loading products...
            </div>
          ) : safeVisibleProducts.length > 0 ? (
            safeVisibleProducts.map((product) => {
              const displayedImage = product.image || "";
              const quantity = Number(product.quantity) || 0;

              return (
                <article
                  className="store-product-card"
                  key={getProductId(product)}
                  role="group"
                  tabIndex={0}
                  aria-label={`View details for ${product.name}`}
                  onClick={() => onOpenProduct?.(product)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenProduct?.(product);
                    }
                  }}
                >
                  <div className="store-product-card-image" aria-hidden="true">
                    {displayedImage ? (
                      <img
                        src={displayedImage}
                        alt={product.name || "Product"}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "/images/product-placeholder.png";
                        }}
                      />
                    ) : (
                      <PackageOpen size={34} />
                    )}
                    {Array.isArray(product.images) && product.images.filter(Boolean).length > 1 && (
                      <span className="store-product-image-count">{product.images.filter(Boolean).length} photos · Click for details</span>
                    )}
                  </div>

                  <div className="store-product-card-body">
                    <span className="category-pill">
                      {product.category || "Product"}
                    </span>
                    <h3 className="store-product-title">{product.name}</h3>
                    {(() => {
                      const offer = calculateProductOffer(product, 1);
                      const displayOffers = getDisplayOffers(product);
                      return <><span className="store-product-price">{currency.format(offer.pricePerUnit)}{offer.offer && <><del>{currency.format(Number(product.price) || 0)}</del><small className="store-product-offer-label">{formatOfferDiscount(offer.offer)}</small></>}</span>{displayOffers.length > 0 && !offer.offer && <small className="store-product-offer-teaser">{displayOffers.length} offer{displayOffers.length === 1 ? "" : "s"} · see details</small>}</>;
                    })()}

                    <button
                      className="store-product-details-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenProduct?.(product);
                      }}
                    >
                      View product details
                    </button>

                    <div className={`store-product-card-actions ${getCartCount(product) > 0 ? "has-cart-controls" : ""}`} onClick={(event) => event.stopPropagation()}>
                      {(canEditProducts || canManageProducts) && (
                        <>
                          {canEditProducts && <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => onEdit?.(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={15} />
                          </button>}
                          {canManageProducts && <>
                          <button
                            className="button button-ghost button-danger"
                            type="button"
                            onClick={() => onDelete?.(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                          </>}
                        </>
                      )}

                      {canPurchase && <>
                        {renderCartAction(product)}
                        <button
                          className="button button-secondary store-product-buy-now"
                          type="button"
                          disabled={Number(product.quantity) <= 0}
                          onClick={() => onBuyNow?.(product)}
                        >
                          <ShoppingBag size={15} /> Buy now
                        </button>
                      </>}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="store-product-message">
              <PackageOpen size={25} />
              <strong>
                {safeProducts.length
                  ? "No matching products"
                  : "No products available yet"}
              </strong>
              <span>
                {safeProducts.length
                  ? "Try changing your filters."
                  : "Check back soon for new products."}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="product-table">
            <thead>
              <tr>
                <th scope="col">PRODUCT</th>
                <th scope="col">SELLING PRICE</th>
                <th scope="col">CATEGORY</th>
                <th scope="col">CURRENT STOCK</th>
                <th scope="col">STATUS</th>
                {(canManageProducts || canPurchase) && (
                  <th className="actions-heading" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="table-message"
                    colSpan={canEditProducts || canManageProducts || canPurchase ? 6 : 5}
                  >
                    <LoaderCircle className="spinner" size={17} />
                    Loading products...
                  </td>
                </tr>
              ) : safeFilteredProducts.length > 0 ? (
                safeVisibleProducts.map((product) => {
                  const displayedImage = product.image || "";
                  const quantity = Number(product.quantity) || 0;
                  const isLowStock =
                    quantity > 0 && quantity < LOW_STOCK_THRESHOLD;
                  const isOutOfStock = quantity <= 0;

                  return (
                    <tr
                      key={getProductId(product)}
                      className="product-table-row"
                      tabIndex={0}
                      aria-label={`View details for ${product.name}`}
                      onClick={() => onOpenProduct?.(product)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenProduct?.(product);
                        }
                      }}
                    >
                      <td className="mobile-product-cell">
                        <div className="product-cell-content">
                          {displayedImage ? (
                            <img
                              className="product-thumbnail"
                              src={displayedImage}
                              alt=""
                              loading="eager"
                            />
                          ) : (
                            <span
                              className="product-thumbnail product-thumbnail-empty"
                              aria-hidden="true"
                            >
                              <PackageOpen size={17} />
                            </span>
                          )}
                          <div className="product-cell-copy">
                            <div className="product-name" title={product.name}>
                              {product.name}
                            </div>
                            <div
                              className="product-description"
                              title={product.description}
                            >
                              {product.description
                                ? product.description.length > 55
                                  ? `${product.description.slice(0, 55)}...`
                                  : product.description
                                : "No description added"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="product-price">
                        {currency.format(Number(product.price) || 0)}
                      </td>
                      <td>
                        <span className="category-pill">
                          {product.category || "Product"}
                        </span>
                      </td>
                      <td>{quantity}</td>
                      <td>
                        <span
                          className={`stock-badge ${
                            isOutOfStock
                              ? "is-empty"
                              : isLowStock
                                ? "is-low"
                                : ""
                          }`}
                        >
                          {isOutOfStock
                            ? "Out of stock"
                            : isLowStock
                              ? "Low stock"
                              : "In stock"}
                        </span>
                      </td>

                      {(canEditProducts || canManageProducts || canPurchase) && (
                        <td className="actions-cell">
                          <div
                            className="table-actions"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {(canEditProducts || canManageProducts) && (
                              <>
                                {canEditProducts && <button
                                  className="button button-ghost"
                                  type="button"
                                  onClick={() => onEdit?.(product)}
                                  aria-label={`Edit ${product.name}`}
                                >
                                  <Pencil size={15} />
                                </button>}
                                {canManageProducts && <>
                                <button
                                  className="button button-ghost button-danger"
                                  type="button"
                                  onClick={() => onDelete?.(product)}
                                  aria-label={`Delete ${product.name}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                                </>}
                              </>
                            )}
                            {canPurchase && (
                              renderCartAction(product)
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="table-message"
                    colSpan={canEditProducts || canManageProducts || canPurchase ? 6 : 5}
                  >
                    <PackageOpen size={25} />
                    <strong>
                      {safeProducts.length
                        ? "No matching products"
                        : "No products available yet"}
                    </strong>
                    <span>
                      {safeProducts.length
                        ? "Try changing your filters."
                        : "No products available yet."}
                    </span>
                    {!safeProducts.length && canCreateProducts && (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={onCreate}
                      >
                        <CirclePlus size={15} /> Add product
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {hasMoreProducts && (
        <div
          className="catalogue-load-more-sentinel"
          ref={loadMoreRef}
          role="status"
          aria-label="More products will load as you scroll"
        />
      )}

      <footer className="catalogue-footer">
        <span>
          Showing{" "}
          {safeFilteredProducts.length
            ? Math.min(
                safeVisibleProducts.length,
                safeFilteredProducts.length,
              )
            : 0}{" "}
          of {safeFilteredProducts.length} matching products (
          {safeProducts.length} total)
        </span>

        {connection === "offline" && safeProducts.length > 0 && (
          <span role="status">Could not refresh from API</span>
        )}


      </footer>
    </section>
  );
}
