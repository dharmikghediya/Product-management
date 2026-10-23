import { useState } from "react";
import { Tags } from "lucide-react";

function DialogBackdrop({ children, onDismiss, preventDismiss = false }) {
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !preventDismiss) onDismiss();
      }}
    >
      {children}
    </div>
  );
}

export function CategoryPickerDialog({ categories, onClose, onSelect }) {
  return (
    <DialogBackdrop onDismiss={onClose}>
      <section
        className="product-dialog category-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">BROWSE INVENTORY</span>
            <h2 id="category-dialog-title">All categories</h2>
          </div>
          <button className="button button-quiet" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="category-picker-list">
          {categories.map((item) => (
            <button
              className="category-picker-item"
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
            >
              <span className="category-card-icon"><Tags size={19} /></span>
              <span className="category-picker-copy">
                <strong>{item.name}</strong>
                <span>
                  {item.productCount} {item.productCount === 1 ? "product" : "products"}
                  {" · "}Stock: {item.units} units
                </span>
              </span>
              {item.lowStockCount > 0 && (
                <span className="category-low-stock">{item.lowStockCount} low</span>
              )}
            </button>
          ))}
        </div>
      </section>
    </DialogBackdrop>
  );
}

export function DeleteConfirmationDialog({
  product,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  return (
    <DialogBackdrop onDismiss={onCancel} preventDismiss={isDeleting}>
      <section
        className="product-dialog delete-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-description"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">CONFIRM DELETE</span>
            <h2 id="delete-confirm-title">Delete this product?</h2>
          </div>
        </div>
        <p id="delete-confirm-description">
          Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
        </p>
        {error && <p className="delete-confirm-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="button button-quiet" type="button" disabled={isDeleting} onClick={onCancel}>
            Cancel
          </button>
          <button className="button button-danger" type="button" disabled={isDeleting} onClick={onConfirm} autoFocus>
            {isDeleting ? "Deleting..." : "Yes, delete product"}
          </button>
        </div>
      </section>
    </DialogBackdrop>
  );
}

export function StockMovementDialog({ products, onClose, onSubmit }) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?._id || products[0]?.id || "");
  const [movementType, setMovementType] = useState("in");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nextQuantity = Number(quantity);
    if (!selectedProductId) {
      setError("Select a product first.");
      return;
    }
    if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
      setError("Enter a valid quantity greater than zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        productId: selectedProductId,
        movementType,
        quantity: nextQuantity,
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to update stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogBackdrop onDismiss={onClose} preventDismiss={isSubmitting}>
      <section
        className="product-dialog stock-movement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-movement-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">STOCK MOVEMENT</span>
            <h2 id="stock-movement-title">Stock In / Stock Out</h2>
          </div>
          <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close stock movement dialog" disabled={isSubmitting}>
            ×
          </button>
        </div>

        <form className="product-form stock-movement-form" onSubmit={handleSubmit}>
          <label className="form-field form-field-wide">
            Product
            <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} required>
              {products.map((product) => (
                <option key={product._id || product.id} value={product._id || product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field form-field-wide">
            Movement type
            <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
            </select>
          </label>

          <label className="form-field form-field-wide">
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">{error}</p>
          )}

          <div className="dialog-actions">
            <button className="button button-quiet" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : movementType === "in" ? "Log stock in" : "Log stock out"}
            </button>
          </div>
        </form>
      </section>
    </DialogBackdrop>
  );
}

export function PasswordReminderDialog({ onClose }) {
  return (
    <DialogBackdrop onDismiss={onClose}>
      <section
        className="product-dialog password-reminder-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reminder-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">ACCOUNT SECURITY</span>
            <h2 id="password-reminder-title">Password security reminder</h2>
          </div>
        </div>
        <p>
          Use a unique password for this account. If you reuse this password
          elsewhere or think it may have been exposed, change it.
        </p>
        <div className="dialog-actions">
          <button className="button button-primary" type="button" autoFocus onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </DialogBackdrop>
  );
}
