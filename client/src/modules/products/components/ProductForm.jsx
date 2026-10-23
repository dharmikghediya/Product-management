import { useState } from "react";
import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import ProductCreateFields from "./ProductCreateFields.jsx";
import ProductEditFields from "./ProductEditFields.jsx";
import ProductImageField from "./ProductImageField.jsx";
import ProductSpecificationsField from "./ProductSpecificationsField.jsx";
import ProductVideoField from "./ProductVideoField.jsx";
import ProductOffersField from "./ProductOffersField.jsx";
import { CUSTOM_OPTION, DEVICE_TYPES, EMPTY_DEVICE_DETAILS } from "../productFormOptions.js";
import { buildCreatePayload, buildEditPayload } from "../productPayloads.js";
import { normalizeProductCategory } from "../productUtils.js";
import { searchProductImages } from "../api/productsApi.js";

const buildInitialValues = (product, fallbackCategory = "Mobile") => ({
  name: product?.name || "",
  brand: product?.brand || "",
  model: product?.model || "",
  price: String(product?.price ?? ""),
  description: product?.description || "",
  category: normalizeProductCategory(product?.category) || fallbackCategory,
  color: product?.color || String(product?.description || "").match(/(?:^|\|)\s*Color\s*:\s*([^|]+)/i)?.[1]?.trim() || "",
  quantity: String(product?.quantity ?? ""),
});

export default function ProductForm({
  product,
  onSave,
  onCancel,
  onSavingChange,
  actionsClassName = "dialog-actions",
  availableCategories = DEVICE_TYPES,
}) {
  const isEditing = Boolean(product);
  const [values, setValues] = useState(() => buildInitialValues(product, availableCategories[0] || "Mobile"));
  const [deviceType, setDeviceType] = useState(availableCategories[0] || "Mobile");
  const [deviceDetails, setDeviceDetails] = useState(EMPTY_DEVICE_DETAILS);
  const [customFields, setCustomFields] = useState({});
  const [specificationRows, setSpecificationRows] = useState(() => {
    const saved = product?.specifications && typeof product.specifications === "object"
      ? Object.entries(product.specifications).map(([label, value]) => ({ label, value: String(value ?? "") }))
      : [];
    return saved.length ? saved : [
      { label: "Operating System", value: "" },
      { label: "RAM Memory Installed Size", value: "" },
      { label: "CPU Model", value: "" },
      { label: "CPU Speed", value: "" },
      { label: "Size", value: "" },
      { label: "Dimensions", value: "" },
      { label: "Weight", value: "" },
    ];
  });
  const [images, setImages] = useState(() => {
    const savedImages = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    return savedImages.length ? savedImages : product?.image ? [product.image] : [];
  });
  const [videos, setVideos] = useState(() => Array.isArray(product?.videos) ? product.videos.filter(Boolean) : []);
  const [offers, setOffers] = useState(() => Array.isArray(product?.offers) ? product.offers.map((offer) => ({ ...offer, value: String(offer.value ?? ""), minQuantity: String(offer.minQuantity ?? 1) })) : []);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateSaving = (nextIsSaving) => {
    setIsSaving(nextIsSaving);
    onSavingChange?.(nextIsSaving);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleQuantityChange = (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, quantity: value }));
  };

  const handleDeviceTypeChange = (nextType) => {
    setDeviceType(nextType);
    setDeviceDetails(EMPTY_DEVICE_DETAILS);
    setCustomFields({});
  };

  const handleDetailChange = (name, value) => {
    setDeviceDetails((current) => ({ ...current, [name]: value }));
  };

  const handleDetailSelect = (name, value) => {
    const isCustom = value === CUSTOM_OPTION;

    if (name === "brand") {
      setDeviceDetails((current) => ({
        ...current,
        brand: isCustom ? "" : value,
        model: "",
      }));
      setCustomFields((current) => ({ ...current, brand: isCustom, model: false }));
      return;
    }

    setCustomFields((current) => ({ ...current, [name]: isCustom }));
    setDeviceDetails((current) => ({ ...current, [name]: isCustom ? "" : value }));
  };

  const handlePriceSelect = (value) => {
    const isCustom = value === CUSTOM_OPTION;
    setCustomFields((current) => ({ ...current, price: isCustom }));
    setValues((current) => ({ ...current, price: isCustom ? "" : value }));
  };

  const handlePriceInput = (value) => {
    setValues((current) => ({ ...current, price: value }));
  };

  const findProductPhotos = async () => {
    const brand = isEditing ? values.brand : deviceDetails.brand;
    const model = isEditing ? values.model : deviceDetails.model;
    const name = isEditing ? values.name : [brand, model].filter(Boolean).join(" ");
    if (!name.trim() && !brand.trim() && !model.trim()) {
      throw new Error("Enter a product name, brand, or model before searching for photos.");
    }
    const result = await searchProductImages({ name, brand, model });
    return (result.data || []).map((match) => match.image).filter(Boolean);
  };

  const submit = async (event) => {
    event?.preventDefault();
    setError("");
    updateSaving(true);

    try {
      const payload = isEditing
        ? buildEditPayload({ values, images, videos, offers, product, specifications: specificationRows })
        : buildCreatePayload({ deviceType, deviceDetails, values, images, videos, offers, specifications: specificationRows });
      await onSave(payload);
    } catch (saveError) {
      setError(saveError?.message || "Unable to save product.");
      updateSaving(false);
    }
  };

  return (
    <form className="product-form" onSubmit={submit}>
      {isEditing ? (
        <ProductEditFields values={values} onFieldChange={handleFieldChange} />
      ) : (
        <ProductCreateFields
          deviceType={deviceType}
          deviceDetails={deviceDetails}
          customFields={customFields}
          price={values.price}
          quantity={values.quantity}
          availableCategories={availableCategories}
          onDeviceTypeChange={handleDeviceTypeChange}
          onDetailSelect={handleDetailSelect}
          onDetailChange={handleDetailChange}
          onPriceSelect={handlePriceSelect}
          onPriceInput={handlePriceInput}
          onQuantityChange={handleQuantityChange}
        />
      )}

      <ProductSpecificationsField rows={specificationRows} onChange={setSpecificationRows} disabled={isSaving} />
      <ProductOffersField offers={offers} onChange={setOffers} disabled={isSaving} onSaveOffer={() => submit()} saveLabel={isEditing ? "Save product & offer" : "Add product with offer"} />
      <ProductImageField values={images} onChange={setImages} onFindImages={findProductPhotos} disabled={isSaving} />
      <ProductVideoField values={videos} onChange={setVideos} disabled={isSaving} />

      {error && (
        <p className="form-error" role="alert">
          <AlertCircle size={15} /> {error}
        </p>
      )}

      <div className={actionsClassName}>
        <button
          className="button button-quiet"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button className="button button-primary" type="submit" disabled={isSaving}>
          {isSaving ? (
            <LoaderCircle className="spinner" size={16} />
          ) : (
            <Check size={16} />
          )}
          {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add to inventory"}
        </button>
      </div>
    </form>
  );
}
