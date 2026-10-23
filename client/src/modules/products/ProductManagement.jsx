import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ShoppingCart, X } from "lucide-react";
import ProductCatalogue from "./components/ProductCatalogue.jsx";
import CartPage from "./components/CartPage.jsx";
import ProductDetails from "./components/ProductDetails.jsx";
import ProductDialog from "./components/ProductDialog.jsx";
import AddProductPage from "./components/AddProductPage.jsx";
import ProductMetrics from "./components/ProductMetrics.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import ProductSidebar, {AppHeader,StorefrontNavigation,} from "./components/ProductNavigation.jsx";
import OrdersPage from "./components/OrdersPage.jsx";
import UsersPage from "./components/UsersPage.jsx";
import StockHistoryPage from "./components/StockHistoryPage.jsx";
import { AboutPage,CategoryPage,ContactPage,PageHeading,} from "./components/ProductInformationPages.jsx";
import {CategoryPickerDialog,DeleteConfirmationDialog,PasswordReminderDialog,StockMovementDialog,} from "./components/ProductManagementDialogs.jsx";
import AuthScreen from "../auth/AuthScreen.jsx";
import { clearSession, readSession, saveSession } from "../auth/authApi.js";
import { apiRequest } from "./api/productsApi.js";
import { currency, getCategoriesForRole, getProductId, LOW_STOCK_THRESHOLD } from "./productUtils.js";
import useInventoryData from "./hooks/useInventoryData.js";
import useProductCatalogue from "./hooks/useProductCatalogue.js";
import ActivityLog from "./components/ActivityLog.jsx";
import "./products.css";
import "./add-product.css";

const normalizeRole = (role) =>
  String(role || "user")
    .trim()
    .toLowerCase();

const readShopperHistory = (userId) => {
  if (!userId) return { viewedProductIds: [], recentSearches: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(`shopper-discovery:${userId}`) || "{}");
    return {
      viewedProductIds: Array.isArray(stored.viewedProductIds) ? stored.viewedProductIds.slice(0, 12) : [],
      recentSearches: Array.isArray(stored.recentSearches) ? stored.recentSearches.slice(0, 8) : [],
    };
  } catch {
    return { viewedProductIds: [], recentSearches: [] };
  }
};

const SAVED_VIEWS = new Set([
  "dashboard", "products", "add-product", "activity", "orders", "my-orders",
  "cart", "users", "stock", "categories", "about", "contact",
]);

const canRestoreView = (view, user = {}) => {
  const role = normalizeRole(user.role);
  const canManageProducts = role === "admin" || user.canManageProducts === true;
  const canViewOperations = ["admin", "staff", "manager"].includes(role);
  if (!SAVED_VIEWS.has(view)) return false;
  if (["activity", "users"].includes(view)) return role === "admin";
  if (["dashboard", "orders", "stock"].includes(view)) return canViewOperations;
  if (view === "my-orders") return role === "user";
  if (view === "cart") return ["manager", "staff", "user"].includes(role);
  if (view === "add-product") return canManageProducts || role === "vendor";
  return true;
};

const readInitialView = () => {
  const savedSession = readSession();
  const role = normalizeRole(savedSession?.user?.role);
  const defaultView = role === "admin" ? "dashboard" : (role === "user" || role === "vendor") ? "products" : "dashboard";
  const userId = savedSession?.user?.id;
  if (!userId) return defaultView;
  try {
    const savedView = window.localStorage.getItem(`stockroom-active-view:${userId}`);
    return canRestoreView(savedView, savedSession.user) ? savedView : defaultView;
  } catch {
    return defaultView;
  }
};

export default function ProductManagement() {
  const [session, setSession] = useState(() => readSession());
  const [shopperHistory, setShopperHistory] = useState(() => readShopperHistory(readSession()?.user?.id));
  const [historyOwnerId, setHistoryOwnerId] = useState(() => readSession()?.user?.id || "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState(readInitialView);
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
const [cart, setCart] = useState([]);
    const cartRef = useRef(cart);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [stockMovementProduct, setStockMovementProduct] = useState(null);
  const [showPasswordReminder, setShowPasswordReminder] = useState(false);
  const [roleRefreshError, setRoleRefreshError] = useState("");
  const hasAuthenticatedHistoryEntry = useRef(false);
  const hasSession = Boolean(session?.token);
  const shopperId = session?.user?.id || "";
  const userRole = normalizeRole(session?.user?.role || "staff");
  const isAdmin = userRole === "admin";
  const isStorefront = userRole === "user";
  const canPurchase = ["manager", "staff", "user"].includes(userRole);
  const canManageProducts = isAdmin || userRole === "vendor" || session?.user?.canManageProducts === true;
  const canEditProducts = canManageProducts || ["staff", "manager", "vendor"].includes(userRole);
  const canCreateProducts = isAdmin || canManageProducts || userRole === "vendor";
  const canLogStockMovement = ["admin", "staff", "manager"].includes(userRole);
  const canViewOperations = ["admin", "staff", "manager"].includes(userRole);
  useEffect(() => {
    if (!shopperId || shopperId === historyOwnerId) return;
    setShopperHistory(readShopperHistory(shopperId));
    setHistoryOwnerId(shopperId);
  }, [shopperId, historyOwnerId]);
  useEffect(() => {
    if (!shopperId || historyOwnerId !== shopperId) return;
    try {
      window.localStorage.setItem(`shopper-discovery:${shopperId}`, JSON.stringify(shopperHistory));
    } catch {
      // Discovery suggestions still work for this session if browser storage is unavailable.
    }
  }, [shopperHistory, shopperId, historyOwnerId]);
  const openProduct = (product) => {
    if (isStorefront) {
      const id = getProductId(product);
      if (id) setShopperHistory((current) => ({
        ...current,
        viewedProductIds: [String(id), ...current.viewedProductIds.filter((item) => String(item) !== String(id))].slice(0, 12),
      }));
    }
    setSelectedProduct(product);
  };
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !canRestoreView(activeView, session.user)) return;
    try {
      window.localStorage.setItem(`stockroom-active-view:${userId}`, activeView);
    } catch {
      // Keep the current view usable when browser storage is unavailable.
    }
  }, [activeView, session?.user?.id, session?.user?.role, session?.user?.canManageProducts]);
  useEffect(() => {
    const operationsViews = ["dashboard", "orders", "stock"];
    const adminViews = ["activity", "users"];
    if (
      (!canViewOperations && operationsViews.includes(activeView)) ||
      (!isAdmin && adminViews.includes(activeView)) ||
      (!canPurchase && activeView === "cart") ||
      (!canCreateProducts && activeView === "add-product")
    ) {
      setActiveView("products");
    }
  }, [activeView, canCreateProducts, canPurchase, canViewOperations, isAdmin]);
  const inventory = useInventoryData(Boolean(session?.token), userRole);
  const allowedCategories = useMemo(
    () => getCategoriesForRole(userRole),
    [userRole],
  );
  const catalogue = useProductCatalogue(inventory.products, allowedCategories);
  useEffect(() => {
    if (!isStorefront) return undefined;
    const term = String(catalogue.search || "").trim();
    if (term.length < 2) return undefined;
    const timer = window.setTimeout(() => setShopperHistory((current) => ({
      ...current,
      recentSearches: [term, ...current.recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 8),
    })), 650);
    return () => window.clearTimeout(timer);
  }, [catalogue.search, isStorefront]);
  const { 
    products,
    activityEntries,
    isLoadingActivity,
    activityError,
    isLoading,
    isRefreshing,
    connection,
    loadError,
    feedback,
    setFeedback,
    loadProducts,
    loadActivityLog,
  } = inventory;
  const {
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
  } = catalogue;

  useEffect(() => {
    if (!session?.token || hasAuthenticatedHistoryEntry.current) return;
    window.history.pushState(
      { stockroomAuthenticated: true, stockroomView: activeView },
      "",
      window.location.href,
    );
    hasAuthenticatedHistoryEntry.current = true;
  }, [session?.token]);

  useEffect(() => {
    const handleHistoryNavigation = (event) => {
      if (event.state?.stockroomAuthenticated) {
        const savedSession = readSession();
        if (savedSession?.token) setSession(savedSession);
        if (event.state.stockroomView) {
          setSelectedProduct(null);
          setActiveView(event.state.stockroomView);
        }
        return;
      }

      if (readSession()?.token) {
        setSession(null);
      }
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () =>
      window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setSession(null);
    window.addEventListener("stockroom:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("stockroom:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!hasSession) return undefined;

    let isCurrent = true;
    apiRequest("/users/me")
      .then((result) => {
        if (!isCurrent || !result.token || !result.data) return;
        const refreshedRole = normalizeRole(result.data.role);
        const refreshedSession = {
          token: result.token,
          user: {
            id: result.data._id || result.data.id,
            name: result.data.name,
            email: result.data.email,
            role: refreshedRole,
            canManageProducts: result.data.canManageProducts === true,
          },
        };
        saveSession(refreshedSession);
        setSession(refreshedSession);
        if (
          refreshedRole === "admin" &&
          normalizeRole(session?.user?.role) !== "admin"
        ) {
          setActiveView("users");
        }
        setRoleRefreshError("");
      })
      .catch((error) => {
        if (isCurrent) setRoleRefreshError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [hasSession]);

  const handleAuthenticated = (newSession) => {
    saveSession(newSession);
    setSession(newSession);
    setActiveView(
      normalizeRole(newSession.user?.role) === "admin"
        ? "users"
        : normalizeRole(newSession.user?.role) === "user"
          ? "products"
          : "dashboard",
    );
    setShowPasswordReminder(true);
  };

  const handleSignOut = () => {
    clearSession();
    setSession(null);
    hasAuthenticatedHistoryEntry.current = false;
  };

  const handleStockMovement = async ({ productId, movementType, quantity }) => {
    const targetProduct = products.find(
      (product) => getProductId(product) === productId,
    );
    if (!targetProduct) {
      throw new Error("Product not found.");
    }

    const currentQuantity = Number(targetProduct.quantity) || 0;
    const nextQuantity =
      movementType === "in"
        ? currentQuantity + quantity
        : currentQuantity - quantity;

    if (nextQuantity < 0) {
      throw new Error("Stock cannot go below zero.");
    }

    await apiRequest("/stock-movements/", {
      method: "POST",
      body: JSON.stringify({
        productId,
        movementType: movementType === "in" ? "stock_in" : "stock_out",
        quantity,
      }),
    });
    await inventory.loadProducts();
    setStockMovementProduct(null);
    setFeedback({
      type: "success",
      message: `${movementType === "in" ? "Stock in" : "Stock out"} recorded successfully.`,
    });
  };

  useEffect(() => {
    if (!isCategoryDialogOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsCategoryDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategoryDialogOpen]);

  const saveProduct = async (values) => {
    const isEdit = Boolean(activeProduct);
    try {
      setFeedback(null);

      await inventory.saveProduct(activeProduct, values);

      if (!isEdit) {
        catalogue.resetFilters();
      }

      setActiveProduct(null);
      setFeedback({
        type: "success",
        message: isEdit
          ? "Product updated successfully."
          : "Product created successfully.",
      });

      if (!isEdit) {
        navigateTo("products");
      }
    } catch (error) {
      console.error("Save product failed:", error);

      setFeedback({
        type: "error",
        message: error?.message || "Unable to save product.",
      });

      // Keep the form open so the user can correct the problem.
      throw error;
    }
  };

  const requestProductDeletion = (product) => {
    setDeleteError("");
    setProductToDelete(product);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || isDeletingProduct) return;
    setIsDeletingProduct(true);
    setDeleteError("");
    try {
      await inventory.deleteProduct(productToDelete);
      setProductToDelete(null);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const closeDialog = () => {
    setActiveProduct(null);
  };

  const updateCart = (updater) => {
    const nextCart = updater(cartRef.current);
    cartRef.current = nextCart;
    setCart(nextCart);
    return nextCart;
  };

  const addToCart = (product) => {
    const productId = getProductId(product);
    const availableStock = Math.max(
      0,
      Math.floor(Number(product.quantity) || 0),
    );
    if (!productId) {
      setFeedback({
        type: "error",
        message:
          "This product could not be added. Refresh the catalogue and try again.",
      });
      return false;
    }
    const currentItem = cartRef.current.find(
      (item) => getProductId(item) === productId,
    );
    if (availableStock <= 0 || currentItem?.quantity >= availableStock) {
      setFeedback({
        type: "error",
        message: `Only ${availableStock} ${product.name} available.`,
      });
      return false;
    }
    updateCart((current) => {
      const existingItem = current.find(
        (item) => getProductId(item) === productId,
      );
      if (existingItem) {
        return current.map((item) =>
          getProductId(item) === productId
            ? {
                ...item,
                quantity: item.quantity + 1,
                quantityInStock: availableStock,
              }
            : item,
        );
      }
      return [
        ...current,
        { ...product, quantity: 1, quantityInStock: availableStock },
      ];
    });
    setFeedback({
      type: "success",
      message: `${product.name} added to your cart.`,
    });
    return true;
  };

  const updateCartQuantity = (productId, nextQuantity) => {
    updateCart((current) =>
      current.map((item) => {
        if (getProductId(item) !== productId) return item;
        return {
          ...item,
          quantity: Math.max(
            1,
            Math.min(Number(nextQuantity) || 1, item.quantityInStock),
          ),
        };
      }),
    );
  };

  const buyNow = (product) => {
    const productId = getProductId(product);
    const alreadyInCart = cartRef.current.some((item) => getProductId(item) === productId);
    if (alreadyInCart || addToCart(product)) navigateTo("cart");
  };

  const placeCartOrder = async (items, deliveryDetails) => {
    const result = await apiRequest("/orders/", {
      method: "POST",
      body: JSON.stringify({
        notes: "Customer checkout",
        ...deliveryDetails,
        items: items.map((item) => ({
          productId: getProductId(item),
          quantity: item.quantity,
        })),
      }),
    });
    updateCart(() => []);
    await loadProducts();
    return result.data;
  };

  const reorderOrder = (order) => {
    const requestedItems = order.items || [];
    let addedAny = false;
    updateCart((current) => {
      let updated = [...current];
      requestedItems.forEach((orderItem) => {
        const orderProductId = orderItem.productId?._id || orderItem.productId?.id || orderItem.productId;
        const product = products.find((item) => String(getProductId(item)) === String(orderProductId));
        if (!product) return;
        const stock = Math.max(0, Math.floor(Number(product.quantity) || 0));
        if (!stock) return;
        const existing = updated.find((item) => String(getProductId(item)) === String(getProductId(product)));
        const currentQuantity = Number(existing?.quantity || 0);
        const addQuantity = Math.min(Math.max(1, Number(orderItem.quantity) || 1), Math.max(0, stock - currentQuantity));
        if (!addQuantity) return;
        addedAny = true;
        if (existing) {
          updated = updated.map((item) => String(getProductId(item)) === String(getProductId(product))
            ? { ...item, quantity: currentQuantity + addQuantity, quantityInStock: stock }
            : item);
        } else {
          updated.push({ ...product, quantity: addQuantity, quantityInStock: stock });
        }
      });
      return updated;
    });
    if (!addedAny) {
      setFeedback({ type: "error", message: "These products are unavailable or already at the stock limit." });
      return;
    }
    setFeedback({ type: "success", message: "Available items from your order were added to the cart." });
    navigateTo("cart");
  };

  const navigateTo = (view) => {
    if (view !== activeView || selectedProduct) {
      window.history.pushState(
        { stockroomAuthenticated: true, stockroomView: view },
        "",
        window.location.href,
      );
    }
    setSelectedProduct(null);
    setActiveView(view);
  };

  if (!session?.token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        session={session}
        lowStockProducts={products.filter(
          (product) => Number(product.quantity) < LOW_STOCK_THRESHOLD,
        )}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        onSignOut={handleSignOut}
        onNavigate={navigateTo}
        isStorefront={isStorefront}
      />

      {isStorefront && (
        <StorefrontNavigation
          activeView={activeView}
          cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
          onNavigate={navigateTo}
          onOpenCategories={() => setIsCategoryDialogOpen(true)}
        />
      )}

      <div
        className={`workspace-layout ${isStorefront ? "storefront-layout" : isSidebarOpen ? "" : "sidebar-is-collapsed"}`}
      >
        {!isStorefront && (
          <ProductSidebar
            activeView={activeView}
            isCategoryDialogOpen={isCategoryDialogOpen}
            productCount={products.length}
            canViewActivity={isAdmin}
            canManageUsers={isAdmin}
            canViewOperations={canViewOperations}
            canPurchase={canPurchase}
            cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
            onNavigate={navigateTo}
            onOpenCategories={() => setIsCategoryDialogOpen(true)}
          />
        )}

        <main className="page-content">
          {roleRefreshError && (
            <div className="standalone-error" role="alert">
              Could not refresh account permissions: {roleRefreshError}
            </div>
          )}
          {selectedProduct ? (
            <ProductDetails
              key={getProductId(selectedProduct)}
              products={products}
              product={(() => {
                const currentProduct = products.find(
                  (product) =>
                    getProductId(product) === getProductId(selectedProduct),
                );
                return currentProduct
                  ? {
                      ...currentProduct,
                      image:
                        currentProduct.image || selectedProduct.image || "",
                      images:
                        currentProduct.images?.length
                          ? currentProduct.images
                          : selectedProduct.images || [],
                      imageSource:
                        currentProduct.imageSource ||
                        selectedProduct.imageSource ||
                        "",
                    }
                  : selectedProduct;
              })()}
              canManageProducts={canManageProducts}
              canEditProducts={canEditProducts}
              canLogStockMovement={canLogStockMovement}
              canPurchase={canPurchase}
              cartItems={cart}
              isStorefront={isStorefront}
              onAddToCart={addToCart}
              onCartQuantityChange={updateCartQuantity}
              onRemoveFromCart={(productId) =>
                updateCart((current) => current.filter((item) => getProductId(item) !== productId))
              }
              onBuyNow={buyNow}
              onSubmitReview={inventory.submitProductReview}
              onOpenProduct={openProduct}
              onBack={() => navigateTo("products")}
              onEdit={(product) => {
                setActiveProduct(product);
                setSelectedProduct(null);
                setActiveView("products");
              }}
            />
          ) : activeView === "add-product" ? (
            <AddProductPage
              onCancel={() => navigateTo("products")}
              onSave={saveProduct}
              onProductsChanged={loadProducts}
              onNavigateToProducts={() => navigateTo("products")}
              userRole={userRole}
            />
          ) : (
            <>
              {!(isStorefront && activeView === "products") && (
                <PageHeading
                  view={activeView}
                  canCreateProducts={canCreateProducts}
                  onAddProduct={() => navigateTo("add-product")}
                />
              )}

              {activeView === "dashboard" && canViewOperations && (
                <section
                  id="overview"
                  className="dashboard-section"
                  aria-label="Inventory overview"
                >
                  <ProductMetrics
                    productCount={products.length}
                    inventoryValue={inventoryValue}
                    lowStockCount={lowStockCount}
                    categoryCount={categories.length}
                    currency={currency}
                    showInventoryValue={isAdmin}
                  />
                  <DashboardCharts
                    products={products}
                    onOpenProduct={setSelectedProduct}
                    onViewProducts={() => navigateTo("products")}
                  />
                </section>
              )}

{activeView === "products" && (
                <ProductCatalogue
                  products={products}
                  filteredProducts={filteredProducts}
                  visibleProducts={visibleProducts}
                  hasMoreProducts={hasMoreProducts}
                  onLoadMore={loadMoreProducts}
                  categories={categories}
                  search={search}
                  onSearchChange={(value) => {
                    setSearch(value);
                    resetVisibleProducts();
                  }}
                  category={category}
                  onCategoryChange={(value) => {
                    setCategory(value);
                    resetVisibleProducts();
                  }}
                  status={status}
                  onStatusChange={(value) => {
                    setStatus(value);
                    resetVisibleProducts();
                  }}
                  minPrice={minPrice}
                  onMinPriceChange={(value) => {
                    setMinPrice(value);
                    resetVisibleProducts();
                  }}
                  maxPrice={maxPrice}
                  onMaxPriceChange={(value) => {
                    setMaxPrice(value);
                    resetVisibleProducts();
                  }}
                  minStock={minStock}
                  onMinStockChange={(value) => {
                    setMinStock(value);
                    resetVisibleProducts();
                  }}
                  maxStock={maxStock}
                  onMaxStockChange={(value) => {
                    setMaxStock(value);
                    resetVisibleProducts();
                  }}
                  onResetFilters={resetFilters}
                  isRefreshing={isRefreshing}
                  onRefresh={loadProducts}
                  feedback={feedback}
                  onDismissFeedback={() => setFeedback(null)}
                  loadError={loadError}
                  onRetry={loadProducts}
                  isLoading={isLoading}
                  canManageProducts={canManageProducts}
                  canEditProducts={canEditProducts}
                  canCreateProducts={canCreateProducts}
                  canPurchase={canPurchase}
                  cartItems={cart}
                  onCartQuantityChange={updateCartQuantity}
                  onRemoveFromCart={(productId) =>
                    updateCart((current) =>
                      current.filter((item) => getProductId(item) !== productId),
                    )
                  }
                  isStorefront={isStorefront}
                  onAddToCart={addToCart}
                  onBuyNow={buyNow}
                  canLogStockMovement={canLogStockMovement}
                  onEdit={setActiveProduct}
                  onDelete={requestProductDeletion}
                  onOpenProduct={openProduct}
                  viewedProductIds={shopperHistory.viewedProductIds}
                  recentSearches={shopperHistory.recentSearches}
                  onNavigateToCart={() => navigateTo("cart")}
                  onCreate={() => navigateTo("add-product")}
                  onLogStockMovement={() => setStockMovementProduct(true)}
                  connection={connection}
                />
              )}

              {activeView === "activity" && (
                <ActivityLog
                  entries={activityEntries}
                  isLoading={isLoadingActivity}
                  error={activityError}
                  onRetry={loadActivityLog}
                />
              )}

              {activeView === "orders" && canViewOperations && (
                <OrdersPage
                  products={products}
                  onInventoryChanged={loadProducts}
                  canCreateOrders={!isAdmin}
                  canManageShipping={canViewOperations}
                />
              )}
              {activeView === "my-orders" && isStorefront && (
                <OrdersPage
                  products={products}
                  onInventoryChanged={loadProducts}
                  canCreateOrders={false}
                  canManageShipping={false}
                  canReorder
                  onReorder={reorderOrder}
                />
              )}
              {activeView === "cart" && canPurchase && (
                <CartPage
                  items={cart}
                  customerName={session?.user?.name || ""}
                  onQuantityChange={updateCartQuantity}
                  onRemove={(productId) =>
                    updateCart((current) =>
                      current.filter(
                        (item) => getProductId(item) !== productId,
                      ),
                    )
                  }
                  onContinueShopping={() => navigateTo("products")}
                  onCheckout={placeCartOrder}
                />
              )}
              {activeView === "users" && isAdmin && <UsersPage />}
              {activeView === "stock" && canViewOperations && (
                <StockHistoryPage />
              )}

              {activeView === "categories" && (
                <CategoryPage
                  categories={categorySummaries}
                  canCreateProducts={canCreateProducts}
                  onSelect={(item) => {
                    setCategory(item);
                    setSearch("");
                    resetVisibleProducts();
                    navigateTo("products");
                  }}
                  onAddProduct={() => navigateTo("add-product")}
                />
              )}

              {activeView === "about" && <AboutPage />}

              {activeView === "contact" && <ContactPage />}
            </>
          )}
        </main>
      </div>

      {isCategoryDialogOpen && (
        <CategoryPickerDialog
          categories={categorySummaries}
          onClose={() => setIsCategoryDialogOpen(false)}
          onSelect={(item) => {
            setCategory(item);
            setSearch("");
            resetVisibleProducts();
            setIsCategoryDialogOpen(false);
            navigateTo("products");
          }}
        />
      )}
      {activeProduct && (
        <ProductDialog
          product={activeProduct}
          onClose={closeDialog}
          onSave={saveProduct}
        />
      )}
      {stockMovementProduct && (
        <StockMovementDialog
          products={products}
          onClose={() => setStockMovementProduct(null)}
          onSubmit={handleStockMovement}
        />
      )}
      {productToDelete && (
        <DeleteConfirmationDialog
          product={productToDelete}
          error={deleteError}
          isDeleting={isDeletingProduct}
          onCancel={() => setProductToDelete(null)}
          onConfirm={handleDeleteProduct}
        />
      )}
      {showPasswordReminder && (
        <PasswordReminderDialog
          onClose={() => setShowPasswordReminder(false)}
        />
      )}
    </div>
  );
}
