import { Boxes, CircleDollarSign, Tags, TriangleAlert } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "../productUtils.js";

export default function ProductMetrics({
  productCount,
  inventoryValue,
  lowStockCount,
  categoryCount,
  currency,
  showInventoryValue = true,
}) {
  return (
    <section className="metrics-grid" aria-label="Inventory summary">
      <div className="metric-card">
        <div className="metric-topline">
          <span className="metric-label">Total products</span>
          <span className="metric-icon"><Boxes size={17} /></span>
        </div>
        <strong className="metric-value">{productCount}</strong>
        <span className="metric-note">Across your catalogue</span>
      </div>
      {showInventoryValue && (
        <div className="metric-card">
          <div className="metric-topline">
            <span className="metric-label">Inventory value</span>
            <span className="metric-icon"><CircleDollarSign size={17} /></span>
          </div>
          <strong className="metric-value">
            {currency.format(inventoryValue)}
          </strong>
          <span className="metric-note">Based on current stock</span>
        </div>
      )}
      <div className="metric-card metric-card-alert">
        <div className="metric-topline">
          <span className="metric-label">Low stock</span>
          <span className="metric-icon"><TriangleAlert size={17} /></span>
        </div>
        <strong className="metric-value">{lowStockCount}</strong>
        <span className="metric-note">Fewer than {LOW_STOCK_THRESHOLD} units</span>
      </div>
      <div className="metric-card">
        <div className="metric-topline">
          <span className="metric-label">Categories</span>
          <span className="metric-icon"><Tags size={17} /></span>
        </div>
        <strong className="metric-value">{categoryCount}</strong>
        <span className="metric-note">Product groups</span>
      </div>
    </section>
  );
}
