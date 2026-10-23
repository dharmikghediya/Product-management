import { useState } from "react";
import { X, LoaderCircle, Check, Upload } from "lucide-react";
import { importScrapedProduct } from "../api/productsApi.js";
import { PRODUCT_CATEGORIES } from "../productUtils.js";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

export default function ImportProductDialog({ item, onClose, onImported }) {
  if (!item) return null;

  const [values, setValues] = useState({
    title: item.title || "",
    brand: item.brand || "",
    model: item.model || "",
    price: String(item.price || ""),
    category: item.category || "Mobile",
    quantity: String(item.quantity || 10),
    description: item.description || "",
    image: item.image || "",
    sourceUrl: item.sourceUrl || "",
    merchant: item.merchant || "",
  });
  const [imagePreview, setImagePreview] = useState(item.image || "");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleChange = (field) => (event) => {
    setError("");
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2 MB or smaller.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setError("");
      setImagePreview(dataUrl);
      setValues((current) => ({ ...current, image: dataUrl }));
    } catch (err) {
      setError("Could not read that image. Try another file.");
    }
  };

  const clearImage = () => {
    setError("");
    setImagePreview("");
    setValues((current) => ({ ...current, image: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsImporting(true);
    try {
      await importScrapedProduct({
        title: values.title.trim(),
        brand: values.brand.trim(),
        model: values.model.trim(),
        price: Number(values.price) || 0,
        category: values.category,
        quantity: Number(values.quantity) || 10,
        description: values.description.trim(),
        image: values.image.trim(),
        sourceUrl: values.sourceUrl.trim(),
        merchant: values.merchant.trim(),
      });
      onImported?.();
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "Failed to import product.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="dialog-backdrop import-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isImporting) onClose();
      }}
    >
      <section
        className="product-dialog import-product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-product-dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">IMPORT PRODUCT</span>
            <h2 id="import-product-dialog-title">Edit before importing</h2>
          </div>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isImporting}
          >
            <X size={18} />
          </button>
        </div>

        <form className="product-form import-product-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Product name
            <input
              type="text"
              name="title"
              value={values.title}
              onChange={handleChange("title")}
              required
              autoFocus
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              Brand
              <input
                type="text"
                name="brand"
                value={values.brand}
                onChange={handleChange("brand")}
              />
            </label>
            <label className="form-field">
              Model
              <input
                type="text"
                name="model"
                value={values.model}
                onChange={handleChange("model")}
              />
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              Price (INR)
              <input
                type="number"
                name="price"
                value={values.price}
                onChange={handleChange("price")}
                min="0"
                required
              />
            </label>
            <label className="form-field">
              Category
              <select
                name="category"
                value={values.category}
                onChange={handleChange("category")}
              >
                {PRODUCT_CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="form-field">
              Quantity
              <input
                type="number"
                name="quantity"
                value={values.quantity}
                onChange={handleChange("quantity")}
                min="1"
                required
              />
            </label>
          </div>

          <label className="form-field form-field-wide">
            Description
            <textarea
              name="description"
              value={values.description}
              onChange={handleChange("description")}
              rows="3"
              placeholder="Product description..."
            />
          </label>

          <label className="form-field form-field-wide image-upload-field">
            <span className="field-label">Product image</span>
            {imagePreview ? (
              <div className="image-preview-card">
                <img src={imagePreview} alt="Preview" className="image-preview-img" />
                <button
                  type="button"
                  className="button button-quiet image-remove-btn"
                  onClick={clearImage}
                  disabled={isImporting}
                >
                  Remove
                </button>
              </div>
            ) : null}
            <label className="image-upload-label">
              <Upload size={16} />
              {values.image ? "Change image" : "Choose image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={isImporting}
                className="sr-only"
              />
            </label>
            <small className="image-hint">PNG, JPEG, WebP, or GIF · up to 2 MB</small>
          </label>

          <label className="form-field form-field-wide">
            Source URL
            <input
              type="text"
              name="sourceUrl"
              value={values.sourceUrl}
              onChange={handleChange("sourceUrl")}
              placeholder="https://..."
            />
          </label>

          <label className="form-field form-field-wide">
            Merchant
            <input
              type="text"
              name="merchant"
              value={values.merchant}
              onChange={handleChange("merchant")}
            />
          </label>

          {error && (
            <p className="form-error import-form-error" role="alert">{error}</p>
          )}

          <div className="dialog-actions import-dialog-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={onClose}
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={isImporting || !values.title.trim()}
            >
              {isImporting ? (
                <>
                  <LoaderCircle size={16} className="spinner" />
                  Importing...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Import product
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
