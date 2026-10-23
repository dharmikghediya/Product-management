import { DEVICE_TYPES } from "../productFormOptions.js";

export default function ProductEditFields({ values, onFieldChange }) {
  return (
    <>
      <label className="form-field form-field-wide">
        Product name
        <input
          name="name"
          value={values.name}
          onChange={onFieldChange}
          minLength={2}
          maxLength={100}
          required
          autoFocus
        />
      </label>
      <label className="form-field">
        Brand
        <input
          name="brand"
          value={values.brand || ""}
          onChange={onFieldChange}
          maxLength={80}
          placeholder="For example: Samsung"
        />
      </label>
      <label className="form-field">
        Model
        <input
          name="model"
          value={values.model || ""}
          onChange={onFieldChange}
          maxLength={100}
          placeholder="For example: Galaxy S26 Ultra"
        />
      </label>
      <label className="form-field">
        Price <small>INR</small>
        <input
          name="price"
          type="number"
          value={values.price}
          onChange={onFieldChange}
          min="0"
          step="0.01"
          required
        />
      </label>
      <label className="form-field">
        Quantity
        <input
          name="quantity"
          type="number"
          value={values.quantity}
          onChange={onFieldChange}
          min="0"
          step="1"
          required
        />
      </label>
      <label className="form-field form-field-wide">
        Category
        <select
          name="category"
          value={values.category}
          onChange={onFieldChange}
          required
        >
          {DEVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field form-field-wide">
        Color
        <input
          name="color"
          value={values.color}
          onChange={onFieldChange}
          maxLength={40}
          placeholder="For example: Midnight black"
        />
      </label>
      <label className="form-field form-field-wide">
        Description
        <textarea
          name="description"
          value={values.description}
          onChange={onFieldChange}
          minLength={10}
          maxLength={1000}
          required
        />
      </label>
    </>
  );
}
