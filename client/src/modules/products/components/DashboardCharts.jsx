import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  CircleAlert,
  PackageOpen,
} from "lucide-react";
import { getProductId, LOW_STOCK_THRESHOLD } from "../productUtils.js";

export default function DashboardCharts({
  products,
  onOpenProduct,
  onViewProducts,
}) {
  const categorySummary = products.reduce((totals, product) => {
    const category = product.category || "Uncategorized";
    const total = totals[category] || {
      category,
      productCount: 0,
      units: 0,
      lowStockCount: 0,
    };
    const quantity = Number(product.quantity) || 0;
    total.productCount += 1;
    total.units += quantity;
    if (quantity < LOW_STOCK_THRESHOLD) total.lowStockCount += 1;
    totals[category] = total;
    return totals;
  }, {});
  const categoryCount = Object.keys(categorySummary).length;
  const categoryTotals = Object.values(categorySummary)
    .sort(
      (left, right) =>
        right.units - left.units || left.category.localeCompare(right.category),
    )
    .slice(0, 6);

  const maxUnits = Math.max(
    ...categoryTotals.map((category) => category.units),
    0,
  );
  const lowStockCount = products.filter(
    (product) => Number(product.quantity) < LOW_STOCK_THRESHOLD,
  ).length;
  const healthyStockCount = products.length - lowStockCount;
  const totalProducts = Math.max(products.length, 1);
  const lowStockPercent = (lowStockCount / totalProducts) * 100;
  const attentionProducts = products
    .filter((product) => Number(product.quantity) < LOW_STOCK_THRESHOLD)
    .sort((left, right) => Number(left.quantity) - Number(right.quantity))
    .slice(0, 5);

  return (
    <section className="dashboard-charts" aria-label="Inventory charts">
      <article className="dashboard-chart-card">
        <header className="dashboard-chart-heading">
          <div className="dashboard-chart-icon">
            <ChartNoAxesColumnIncreasing size={17} />
          </div>
          <div>
            <h2>Units by category</h2>
            <p>On-hand quantity across your catalogue</p>
          </div>
        </header>
        {categoryTotals.length ? (
          <ol className="category-chart">
            {categoryTotals.map((category) => (
              <li className="category-chart-row" key={category.category}>
                <div className="category-chart-label">
                  <strong title={category.category}>{category.category}</strong>
                  <span>
                    {category.units} units · {category.productCount}{" "}
                    {category.productCount === 1 ? "product" : "products"}
                  </span>
                </div>
                <div
                  className="category-chart-track"
                  role="img"
                  aria-label={`${category.category}: ${category.units} units`}
                >
                  <span
                    className="category-chart-bar"
                    style={{
                      width: `${maxUnits ? Math.max(3, (category.units / maxUnits) * 100) : 0}%`,
                    }}
                  />
                </div>
                {category.lowStockCount > 0 && (
                  <span className="category-chart-alert">
                    <CircleAlert size={13} /> {category.lowStockCount} low
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="dashboard-chart-empty">
            Add products to see stock by category.
          </p>
        )}
        {categoryCount > 6 && (
          <p className="dashboard-chart-note">
            Showing the 6 categories with the most units.
          </p>
        )}
      </article>

      <article className="dashboard-chart-card stock-health-card">
        <header className="dashboard-chart-heading">
          <div className="dashboard-chart-icon dashboard-chart-icon-alert">
            <CircleAlert size={17} />
          </div>
          <div>
            <h2>Stock health</h2>
            <p>Products by current stock level</p>
          </div>
        </header>
        <div className="stock-health-content">
          <div
            className="stock-health-ring"
            role="img"
            aria-label={`${healthyStockCount} products with healthy stock and ${lowStockCount} low-stock products`}
            style={{ "--low-stock-angle": `${lowStockPercent * 3.6}deg` }}
          >
            <div className="stock-health-ring-center">
              <strong>{products.length}</strong>
              <span>products</span>
            </div>
          </div>
          <ul className="stock-health-legend">
            <li>
              <span className="stock-legend-dot is-healthy" />
              <span>Healthy stock</span>
              <strong>{healthyStockCount}</strong>
            </li>
            <li>
              <span className="stock-legend-dot is-low" />
              <span>Below {LOW_STOCK_THRESHOLD} units</span>
              <strong>{lowStockCount}</strong>
            </li>
          </ul>
        </div>
      </article>

      <article className="dashboard-chart-card dashboard-attention-card">
        <header className="dashboard-chart-heading">
          <div className="dashboard-chart-icon dashboard-chart-icon-alert">
            <CircleAlert size={17} />
          </div>
          <div>
            <h2>Needs attention</h2>
            <p>Products with low or no stock</p>
          </div>
          <button
            className="dashboard-view-link"
            type="button"
            onClick={onViewProducts}
          >
            View products <ArrowRight size={14} />
          </button>
        </header>
        {attentionProducts.length ? (
          <div className="dashboard-attention-list">
            {attentionProducts.map((product) => (
              <button
                className="dashboard-attention-row"
                type="button"
                key={getProductId(product)}
                onClick={() => onOpenProduct(product)}
              >
                {product.image ? (
                  <img src={product.image} alt="" />
                ) : (
                  <span className="dashboard-attention-placeholder">
                    <PackageOpen size={16} />
                  </span>
                )}
                <span className="dashboard-attention-name">
                  <strong>{product.name}</strong>
                  <small>{product.category || "Uncategorized"}</small>
                </span>
                <span className="dashboard-attention-quantity">
                  {Number(product.quantity) || 0} left
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="dashboard-chart-empty">
            All products are above the low-stock threshold.
          </p>
        )}
      </article>
    </section>
  );
}
