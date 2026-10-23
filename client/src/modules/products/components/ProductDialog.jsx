
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ProductForm from "./ProductForm.jsx";
import { DEVICE_TYPES } from "../productFormOptions.js";

export default function ProductDialog({ product, onClose, onSave, availableCategories = DEVICE_TYPES }) {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSaving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        aria-busy={isSaving}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">PRODUCT DETAILS</span>
            <h2 id="product-dialog-title">
              {product?._id || product?.id
                ? "Edit Product"
                : "Add Product"}
            </h2>
          </div>

          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="dialog-body">
          <ProductForm
            product={product}
            onSave={onSave}
            onCancel={onClose}
            onSavingChange={setIsSaving}
          />
        </div>
      </section>
    </div>
  );
}
