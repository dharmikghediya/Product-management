import { useState } from "react";
import { ArrowLeft, Edit3, PackagePlus, Sparkles } from "lucide-react";
import ProductForm from "./ProductForm.jsx";
import AutoImportScraper from "./AutoImportScraper.jsx";
import { getCategoriesForRole } from "../productUtils.js";

export default function AddProductPage({
  onCancel,
  onSave,
  onProductsChanged,
  onNavigateToProducts,
  userRole = "",
}) {
  const [activeTab, setActiveTab] = useState("auto-import");
  const allowedCategories = getCategoriesForRole(userRole);
  const isVendor = String(userRole || "").trim().toLowerCase() === "vendor";

  return (
    <div className="add-product-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">DG TECH STORE / NEW PRODUCT</div>
          <h1 className="page-title">Add Products to Inventory</h1>
          <p className="page-subtitle">
            {isVendor
              ? "Auto-import smartwatches, earbuds and headphones via ScraperAPI without manual typing, or enter details manually."
              : "Auto-import mobile phones and laptops via ScraperAPI without manual typing, or enter details manually."}
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onCancel}
          >
            <ArrowLeft size={16} /> Back to products
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="add-product-tab-switcher" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "auto-import"}
          className={`add-product-tab-btn ${
            activeTab === "auto-import" ? "active" : ""
          }`}
            onClick={() => setActiveTab("auto-import")}
        >
          <Sparkles size={16} />
          Auto-Import (ScraperAPI)
          <span className="tab-pill-recommended">Recommended</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "manual"}
          className={`add-product-tab-btn ${
            activeTab === "manual" ? "active" : ""
          }`}
          onClick={() => setActiveTab("manual")}
        >
          <Edit3 size={15} />
          Manual Entry
        </button>
      </div>

      {activeTab === "auto-import" ? (
        <AutoImportScraper
          onProductsChanged={onProductsChanged}
          onNavigateToProducts={onNavigateToProducts || onCancel}
          userRole={userRole}
        />
      ) : (
        <section className="add-product-card" aria-label="Add a product manually">
          <div className="add-product-card-heading">
            <span className="add-product-card-icon">
              <PackagePlus size={19} />
            </span>
            <div>
              <h2>Manual product details</h2>
              <p>Pick the product type first, then complete its specifications.</p>
            </div>
          </div>

          <ProductForm
            onSave={onSave}
            onCancel={onCancel}
            actionsClassName="add-product-actions"
            availableCategories={allowedCategories}
          />
        </section>
      )}
    </div>
  );
}

