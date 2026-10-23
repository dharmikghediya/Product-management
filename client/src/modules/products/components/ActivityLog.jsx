import { Activity, AlertCircle, LoaderCircle } from "lucide-react";

const FIELD_LABELS = {
  name: "Product",
  category: "Category",
  price: "Price",
  quantity: "Stock",
  description: "Specifications",
  sku: "SKU",
  location: "Shelf location",
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function describeChange(change, action) {
  const label = FIELD_LABELS[change.field] || change.field;
  const before = formatValue(change.before);
  const after = formatValue(change.after);

  if (action === "Added Product") return `${label}: ${after}`;
  if (action === "Deleted Item") return `${label}: ${before} (removed)`;
  return `${label}: ${before} → ${after}`;
}

export default function ActivityLog({ entries, isLoading, error, onRetry }) {
  return (
    <section id="activity" className="activity-panel" aria-labelledby="activity-title" tabIndex={-1}>
      <header className="activity-heading">
        <div>
          <span className="eyebrow">AUDIT TRAIL</span>
          <h2 id="activity-title">Recent inventory activity</h2>
          <p>Who changed what, and exactly when.</p>
        </div>
        <span className="activity-heading-icon" aria-hidden="true"><Activity size={18} /></span>
      </header>

      {error && (
        <p className="activity-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="activity-retry" type="button" onClick={onRetry}>Retry</button>
        </p>
      )}

      {isLoading ? (
        <p className="activity-state"><LoaderCircle className="spinner" size={17} /> Loading activity...</p>
      ) : entries.length ? (
        <ol className="activity-list">
          {entries.map((entry) => (
            <li className="activity-entry" key={entry._id}>
              <span className="activity-marker" aria-hidden="true" />
              <div className="activity-entry-content">
                <div className="activity-entry-topline">
                  <strong>{entry.action}</strong>
                  <time dateTime={entry.timestamp}>{timestampFormatter.format(new Date(entry.timestamp))}</time>
                </div>
                <p className="activity-actor">
                  <strong>{entry.actorName}</strong> · {entry.productName}
                </p>
                <ul className="activity-changes">
                  {entry.changes?.length ? entry.changes.map((change) => (
                    <li key={change.field}>{describeChange(change, entry.action)}</li>
                  )) : (
                    <li>No field values changed.</li>
                  )}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      ) : !error ? (
        <p className="activity-state">No product activity has been recorded yet.</p>
      ) : null}
    </section>
  );
}
