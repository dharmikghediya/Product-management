import { CUSTOM_OPTION } from "../productFormOptions.js";

export default function SelectOrCustomField({
  id,
  label,
  value,
  options,
  isCustom,
  placeholder,
  onSelect,
  onCustomChange,
  inputType = "text",
  minimum,
}) {
  return (
    <label className="form-field" htmlFor={id}>
      {label}
      <select
        id={id}
        value={isCustom ? CUSTOM_OPTION : value}
        onChange={(event) => onSelect(event.target.value)}
        required={!isCustom}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_OPTION}>Custom...</option>
      </select>
      {isCustom && (
        <input
          type={inputType}
          value={value}
          onChange={(event) => onCustomChange(event.target.value)}
          placeholder={placeholder}
          min={minimum}
          step={inputType === "number" ? "0.01" : undefined}
          required
          autoFocus
        />
      )}
    </label>
  );
}
