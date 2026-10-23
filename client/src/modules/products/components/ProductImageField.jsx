import { useState } from "react";
import { AlertCircle, ImagePlus, X } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../productFormOptions.js";

const MAX_PRODUCT_IMAGES = 5;
const MAX_PRODUCT_IMAGE_TOTAL_BYTES = 8 * 1024 * 1024;
const imageBytes = (value) => {
  if (!value.startsWith("data:")) return 0;
  const base64 = value.split(",", 2)[1] || "";
  return Math.floor(base64.length * 0.75);
};

export default function ProductImageField({ values = [], onChange, onFindImages, disabled }) {
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleFindImages = async () => {
    setError("");
    setIsSearching(true);
    try {
      const suggestions = await onFindImages?.();
      if (!suggestions?.length) {
        setError("No matching photos were found. Try a more specific product name or upload photos.");
        return;
      }
      const mergedImages = [...new Set([...values, ...suggestions])].slice(0, MAX_PRODUCT_IMAGES);
      if (mergedImages.length === values.length) {
        setError("No additional matching photos were found.");
        return;
      }
      onChange(mergedImages);
    } catch (searchError) {
      setError(searchError.message || "Could not find product photos. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setError("");
    const remaining = MAX_PRODUCT_IMAGES - values.length;
    if (files.length > remaining) {
      setError(`Choose up to ${MAX_PRODUCT_IMAGES} product photos.`);
      return;
    }
    const invalidFile = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (invalidFile) {
      setError("Choose PNG, JPEG, WebP, or GIF photos.");
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError("Each image must be 2 MB or smaller.");
      return;
    }
    const totalBytes = values.reduce((sum, image) => sum + imageBytes(image), 0)
      + files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_PRODUCT_IMAGE_TOTAL_BYTES) {
      setError("Product photos must be 8 MB or smaller in total.");
      return;
    }

    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })))
      .then((newImages) => onChange([...values, ...newImages]))
      .catch(() => setError("Could not read those photos. Please try again."));
  };

  const removeImage = (index) => onChange(values.filter((_, imageIndex) => imageIndex !== index));

  return (
    <div className="product-image-field">
      <span className="product-image-label">Product photos</span>
      <small className="product-image-hint">Add up to {MAX_PRODUCT_IMAGES} photos (2 MB each, 8 MB total). The first photo is the main image.</small>
      {values.length > 0 && (
        <div className="product-image-gallery">
          {values.map((image, index) => (
            <div className="product-image-thumb" key={`${index}-${image.slice(0, 32)}`}>
              <img src={image} alt={`Product photo ${index + 1}`} />
              <button type="button" onClick={() => removeImage(index)} disabled={disabled} aria-label={`Remove photo ${index + 1}`}>
                <X size={14} />
              </button>
              {index === 0 && <span>Main</span>}
            </div>
          ))}
        </div>
      )}
      <label className="button button-secondary product-image-choose" htmlFor="product-images-input" aria-disabled={disabled || values.length >= MAX_PRODUCT_IMAGES}>
        <ImagePlus size={15} /> Choose photos
      </label>
      <button className="button button-quiet product-image-search" type="button" onClick={handleFindImages} disabled={disabled || isSearching || values.length >= MAX_PRODUCT_IMAGES}>
        <ImagePlus size={15} /> {isSearching ? "Searching photos..." : "Find photos automatically"}
      </button>
      <input
        id="product-images-input"
        className="sr-only"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleChange}
        disabled={disabled || values.length >= MAX_PRODUCT_IMAGES}
      />
      {error && <p className="form-error" role="alert"><AlertCircle size={14} /> {error}</p>}
    </div>
  );
}
