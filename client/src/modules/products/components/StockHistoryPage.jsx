import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, History, RefreshCw, Search } from "lucide-react";
import { apiRequest } from "../api/productsApi.js";

const PAGE_SIZE = 15;
const MOVEMENT_LABELS = {
  stock_in: "Stock added",
  stock_out: "Stock removed",
  order_sale: "Order sale",
  order_cancel: "Order cancelled — stock returned",
  adjustment: "Stock adjustment",
};
const getDirection = (type) => ["stock_in", "order_cancel", "adjustment"].includes(type) ? "in" : "out";
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
};

export default function StockHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchHistory = async ({ keepContent = false } = {}) => {
    try {
      if (keepContent) setIsRefreshing(true);
      else setIsLoading(true);
      const result = await apiRequest("/stock-movements/", { cache: "no-store" });
      setHistory(result.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  useEffect(() => { fetchHistory(); }, []);

  const filteredHistory = useMemo(() => history.filter((entry) => {
    const query = search.trim().toLowerCase();
    const searchable = `${entry.productName || ""} ${entry.note || ""} ${entry.userName || ""} ${entry.movementType || ""}`.toLowerCase();
    return searchable.includes(query) && (typeFilter === "all" || entry.movementType === typeFilter);
  }), [history, search, typeFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const unitsAdded = history.filter((entry) => getDirection(entry.movementType) === "in")
    .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const unitsRemoved = history.filter((entry) => getDirection(entry.movementType) === "out")
    .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);

  return (
    <section className="information-page stock-history-page">
      <article className="information-card stock-history-card">
        <div className="stock-history-heading">
          <div className="section-title-row">
            <span className="information-card-icon"><History size={18} /></span>
            <div><h2>Stock movement history</h2><p>See when stock changed, what changed, and who recorded it.</p></div>
          </div>
          <button className="button button-secondary stock-history-refresh" type="button" aria-label="Refresh stock history" onClick={() => fetchHistory({ keepContent: true })} disabled={isLoading || isRefreshing}><RefreshCw size={15} className={isLoading || isRefreshing ? "spinner" : ""} /> Refresh history</button>
        </div>

        <div className="stock-history-summary" aria-label="Stock movement totals">
          <div><span>Total movements</span><strong>{history.length}</strong></div>
          <div><span>Units added</span><strong className="history-added">+{unitsAdded.toLocaleString("en-IN")}</strong></div>
          <div><span>Units removed</span><strong className="history-removed">−{unitsRemoved.toLocaleString("en-IN")}</strong></div>
        </div>

        <div className="stock-history-filters">
          <label><span>Find product or activity</span><div className="stock-history-search"><Search size={15} aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search product, note, or staff" /></div></label>
          <label><span>Movement type</span><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}><option value="all">All movements</option>{Object.entries(MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <span className="stock-history-result-count">{filteredHistory.length} record{filteredHistory.length === 1 ? "" : "s"}</span>
        </div>

        {error && <div className="standalone-error" role="alert">{error}<button className="button button-secondary" type="button" onClick={() => fetchHistory({ keepContent: history.length > 0 })}>Retry</button></div>}
        {isLoading ? <div className="table-message">Loading stock history...</div> : visibleHistory.length ? (
          <div className="stock-history-list" aria-live="polite">
            {visibleHistory.map((entry) => {
              const direction = getDirection(entry.movementType);
              return <article key={entry._id || entry.id} className={"stock-history-entry is-" + direction}>
                <span className="stock-history-entry-icon" aria-hidden="true">{direction === "in" ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}</span>
                <div className="stock-history-entry-main">
                  <div className="stock-history-entry-title"><strong>{entry.productName || "Unnamed product"}</strong><span className={"stock-history-type type-" + entry.movementType}>{MOVEMENT_LABELS[entry.movementType] || entry.movementType}</span></div>
                  <p>{entry.note || "No note provided"}</p>
                  <div className="stock-history-entry-meta"><span>{formatDate(entry.createdAt)}</span><span>Recorded by {entry.userName || "Unknown user"}</span></div>
                </div>
                <div className="stock-history-entry-quantity"><strong>{direction === "in" ? "+" : "−"}{Number(entry.quantity || 0).toLocaleString("en-IN")}</strong><span>{Number(entry.previousQuantity || 0).toLocaleString("en-IN")} <ArrowDownUp size={12} /> {Number(entry.newQuantity || 0).toLocaleString("en-IN")} in stock</span></div>
              </article>;
            })}
          </div>
        ) : <div className="empty-state">{history.length ? "No stock movements match these filters." : "No stock movements recorded yet."}</div>}

        {pageCount > 1 && <nav className="stock-history-pagination" aria-label="Stock history pages"><span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></nav>}
      </article>
    </section>
  );
}
