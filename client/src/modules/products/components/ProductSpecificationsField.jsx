import { Plus, Trash2 } from "lucide-react";

export default function ProductSpecificationsField({ rows, onChange, disabled }) {
  const updateRow = (index, key, value) => {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };

  const removeRow = (index) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <section className="product-specification-editor" aria-label="Additional product specifications">
      <div className="product-specification-editor-heading">
        <div><strong>Product specifications</strong><small>Add or remove any product detail. Shoppers will see every saved specification on the product page.</small></div>
        <button className="button button-quiet" type="button" disabled={disabled || rows.length >= 30} onClick={() => onChange([...rows, { label: "", value: "" }])}>
          <Plus size={15} /> Add detail
        </button>
      </div>
      {rows.map((row, index) => (
        <div className="product-specification-editor-row" key={index}>
          <label>
            <span className="sr-only">Specification name</span>
            <input value={row.label} onChange={(event) => updateRow(index, "label", event.target.value)} maxLength={60} placeholder="e.g. Operating System or CPU Speed" disabled={disabled} />
          </label>
          <label>
            <span className="sr-only">Specification value</span>
            <input value={row.value} onChange={(event) => updateRow(index, "value", event.target.value)} maxLength={200} placeholder="Enter product detail" disabled={disabled} />
          </label>
          <button className="product-specification-remove" type="button" aria-label="Remove specification" disabled={disabled} onClick={() => removeRow(index)}><Trash2 size={15} /></button>
        </div>
      ))}
    </section>
  );
}
