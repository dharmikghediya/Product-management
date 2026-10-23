import SelectOrCustomField from "./SelectOrCustomField.jsx";
import {
  COLOR_OPTIONS,
  DEVICE_BRANDS,
  DEVICE_TYPES,
  getModelOptions,
  PRICE_OPTIONS,
  PROCESSOR_OPTIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
} from "../productFormOptions.js";

export default function ProductCreateFields({
  deviceType,
  deviceDetails,
  customFields,
  price,
  quantity,
  availableCategories = DEVICE_TYPES,
  onDeviceTypeChange,
  onDetailSelect,
  onDetailChange,
  onPriceSelect,
  onPriceInput,
  onQuantityChange,
}) {
  const selectedBrand = customFields.brand ? "" : deviceDetails.brand;

  return (
    <>
      <label className="form-field form-field-wide">
        Product type
        <select
          className="device-type-select"
          value={deviceType}
          onChange={(event) => onDeviceTypeChange(event.target.value)}
        >
          {availableCategories.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <SelectOrCustomField
        id="product-brand"
        label="Brand"
        value={deviceDetails.brand}
        options={DEVICE_BRANDS[deviceType]}
        isCustom={customFields.brand}
        placeholder="Enter a brand"
        onSelect={(value) => onDetailSelect("brand", value)}
        onCustomChange={(value) => onDetailChange("brand", value)}
      />

      <SelectOrCustomField
        id="product-model"
        label="Model"
        value={deviceDetails.model}
        options={getModelOptions(deviceType, selectedBrand)}
        isCustom={customFields.model}
        placeholder="Enter a model"
        onSelect={(value) => onDetailSelect("model", value)}
        onCustomChange={(value) => onDetailChange("model", value)}
      />

      {deviceType === "Laptop" && (
        <SelectOrCustomField
          id="product-processor"
          label="Processor"
          value={deviceDetails.processor}
          options={PROCESSOR_OPTIONS}
          isCustom={customFields.processor}
          placeholder="Enter a processor"
          onSelect={(value) => onDetailSelect("processor", value)}
          onCustomChange={(value) => onDetailChange("processor", value)}
        />
      )}

      <SelectOrCustomField
        id="product-color"
        label="Color"
        value={deviceDetails.color}
        options={COLOR_OPTIONS}
        isCustom={customFields.color}
        placeholder="Enter the exact product color"
        onSelect={(value) => onDetailSelect("color", value)}
        onCustomChange={(value) => onDetailChange("color", value)}
      />

      <SelectOrCustomField
        id="product-ram"
        label="RAM"
        value={deviceDetails.ram}
        options={RAM_OPTIONS}
        isCustom={customFields.ram}
        placeholder="Enter RAM size"
        onSelect={(value) => onDetailSelect("ram", value)}
        onCustomChange={(value) => onDetailChange("ram", value)}
      />

      <SelectOrCustomField
        id="product-storage"
        label="Storage"
        value={deviceDetails.storage}
        options={STORAGE_OPTIONS}
        isCustom={customFields.storage}
        placeholder="Enter storage size"
        onSelect={(value) => onDetailSelect("storage", value)}
        onCustomChange={(value) => onDetailChange("storage", value)}
      />

      <SelectOrCustomField
        id="product-price"
        label="Price (INR)"
        value={price}
        options={PRICE_OPTIONS}
        isCustom={customFields.price}
        placeholder="Enter price in INR"
        onSelect={onPriceSelect}
        onCustomChange={onPriceInput}
        inputType="number"
        minimum="0"
      />

      <label className="form-field" htmlFor="product-quantity">
        Quantity
        <input
          id="product-quantity"
          name="quantity"
          type="number"
          value={quantity}
          onChange={onQuantityChange}
          min="0"
          step="1"
          required
        />
      </label>
    </>
  );
}
