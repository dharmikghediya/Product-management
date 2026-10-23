import { Plus, Tag, Trash2 } from "lucide-react";
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from "../productUtils.js";

const EMPTY_OFFER = { title: "", description: "", discountType: "percentage", value: "", minQuantity: "1", category: "Mobile" };

export default function ProductOffersField({ offers = [], onChange, disabled = false, onSaveOffer, saveLabel = "Save offer", showCategoryScope = false, availableCategories = PRODUCT_CATEGORIES }) {
  const updateOffer = (index, field, value) => onChange(offers.map((offer, offerIndex) => offerIndex === index ? { ...offer, [field]: value } : offer));
  const addOffer = () => onChange([...offers, { ...EMPTY_OFFER, category: availableCategories[0] || EMPTY_OFFER.category }]);
  const removeOffer = (index) => onChange(offers.filter((_, offerIndex) => offerIndex !== index));

  return (
    <section className="product-offers-field" aria-labelledby="product-offers-title">
      <div className="product-offers-heading">
        <div className="product-offers-heading-copy">
          <span className="eyebrow">PROMOTIONS</span>
          <strong id="product-offers-title">Product offers</strong>
          <small>Add up to 3 offers. Shoppers get the best eligible discount at checkout.</small>
        </div>
        <div className="product-offers-heading-actions">
          {offers.length < 3 && <button className="button button-secondary product-offer-add" type="button" onClick={addOffer} disabled={disabled}><Plus size={13} /> Add offer</button>}
        </div>
      </div>
      {offers.length === 0 ? <p className="product-offers-empty">No offers added to this product.</p> : offers.map((offer, index) => (
        <fieldset className="product-offer-editor" key={`offer-${index}`} disabled={disabled}>
          <legend><Tag size={12} /> Offer {index + 1}</legend>
          <div className={`product-offer-grid${showCategoryScope ? " has-category" : ""}`}>
            <label className="product-offer-field product-offer-title">Offer title<input value={offer.title || ""} onChange={(event) => updateOffer(index, "title", event.target.value)} maxLength={60} placeholder="Example: Summer savings" required /></label>
            <label className="product-offer-field product-offer-description">Description<input value={offer.description || ""} onChange={(event) => updateOffer(index, "description", event.target.value)} maxLength={180} placeholder="Example: Save on your next purchase" /></label>
            {showCategoryScope && <label className="product-offer-field product-offer-category">Applies to<select value={offer.category || availableCategories[0] || "Mobile"} onChange={(event) => updateOffer(index, "category", event.target.value)}>{availableCategories.map((name) => <option key={name} value={name}>{CATEGORY_LABELS[name] || name} only</option>)}<option value="all">All products</option></select></label>}
            <div className="product-offer-editor-row">
              <label className="product-offer-field">Discount type<select value={offer.discountType || "percentage"} onChange={(event) => updateOffer(index, "discountType", event.target.value)}><option value="percentage">Percentage (%)</option><option value="fixed">Amount (₹)</option></select></label>
              <label className="product-offer-field">Discount value<input type="number" value={offer.value ?? ""} onChange={(event) => updateOffer(index, "value", event.target.value)} min="0.01" max={offer.discountType === "fixed" ? undefined : 100} step="0.01" placeholder={offer.discountType === "fixed" ? "₹ amount" : "%"} required /></label>
              <label className="product-offer-field">Minimum quantity<input type="number" value={offer.minQuantity ?? 1} onChange={(event) => updateOffer(index, "minQuantity", event.target.value)} min="1" max="1000" step="1" required /></label>
            </div>
          </div>
          <div className="product-offer-actions">
            <button className="button button-quiet product-offer-remove" type="button" onClick={() => removeOffer(index)}><Trash2 size={13} /> Remove offer</button>
            <button className="button button-primary product-offer-save" type="button" onClick={onSaveOffer} disabled={disabled}>{saveLabel}</button>
          </div>
        </fieldset>
      ))}
      {!showCategoryScope && offers.length > 0 && <p className="product-offer-scope-note">This offer is saved on this product and shown to customers on its product card. Save the product to publish it.</p>}
    </section>
  );
}
