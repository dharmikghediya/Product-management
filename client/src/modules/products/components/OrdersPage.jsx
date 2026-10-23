import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, BadgeCheck, Ban, Camera, ChevronDown, ChevronUp, Package, PackageCheck, Plus, Search, ShoppingCart } from "lucide-react";
import { apiRequest } from "../api/productsApi.js";

const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(amount || 0));
const orderItemThumb = (item, productById) => {
  const productId = item.productId?._id || item.productId?.id || item.productId;
  const product = productById.get(String(productId));
  const firstImage = product?.images?.[0];
  const src = item.image || item.imageUrl || product?.image || (typeof firstImage === "string" ? firstImage : firstImage?.url) || "";
  return src ? <img className="order-item-thumb" src={src} alt={item.productName || "Product"} loading="lazy" /> : <span className="order-line-image-fallback"><Package size={11} /></span>;
};
const imageFileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function OrdersPage({ products = [], onInventoryChanged, canCreateOrders = true, canManageShipping = false, canReorder = false, onReorder }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [shippingEditOrderId, setShippingEditOrderId] = useState("");
  const [shippingDraft, setShippingDraft] = useState({ shippingStatus: "not_shipped", trackingNumber: "", currentLocation: "", estimatedDelivery: "" });
  const [uploadingItemKey, setUploadingItemKey] = useState("");
  const fetchOrders = async ({ silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      const result = await apiRequest("/orders/");
      setOrders(result.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const availableProducts = useMemo(
    () => products.filter((product) => Number(product.quantity) > 0),
    [products],
  );
  const productById = useMemo(() => new Map(products.map((product) => [String(product._id || product.id), product])), [products]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const searchText = `${order.customerName || "Walk-in Customer"} ${order._id || order.id || ""} ${(order.items || []).map((item) => item.productName || "").join(" ")}`.toLowerCase();
    const normalizedStatus = order.status === "completed" ? "delivered" : order.status;
    return searchText.includes(search.toLowerCase()) && (statusFilter === "all" || normalizedStatus === statusFilter);
  }), [orders, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const completedCount = orders.filter((order) => order.status === "delivered" || order.status === "completed").length;
  const soldUnits = orders.filter((order) => order.status !== "cancelled").reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0,
  );

  const updateOrderStatus = async (order, status) => {
    const orderId = order._id || order.id;
    if (status === "cancelled" && !window.confirm("Cancel this order? Its item quantities will be returned to stock.")) return;
    setUpdatingOrderId(orderId);
    setError("");
    try {
      const result = await apiRequest(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((current) => current.map((item) => String(item._id || item.id) === String(orderId) ? result.data : item));
      if (status === "cancelled") await onInventoryChanged?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingOrderId("");
    }
  };

  const uploadOrderItemImage = async (event, order, itemIndex) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Order item images must be 2 MB or smaller.");
      return;
    }
    const orderId = order._id || order.id;
    const uploadKey = `${orderId}-${itemIndex}`;
    setUploadingItemKey(uploadKey);
    setError("");
    try {
      const image = await imageFileToDataUrl(file);
      const result = await apiRequest(`/orders/${encodeURIComponent(orderId)}/items/${itemIndex}/image`, {
        method: "PATCH",
        body: JSON.stringify({ image }),
      });
      setOrders((current) => current.map((item) => String(item._id || item.id) === String(orderId) ? result.data : item));
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload the order item image.");
    } finally {
      setUploadingItemKey("");
    }
  };

  const startShippingEdit = (order) => {
    setShippingEditOrderId(order._id || order.id);
    setShippingDraft({
      shippingStatus: order.shippingStatus || "not_shipped",
      trackingNumber: order.trackingNumber || "",
      currentLocation: order.currentLocation || "",
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().slice(0, 10) : "",
    });
  };

  const saveShippingUpdate = async (order) => {
    const orderId = order._id || order.id;
    setUpdatingOrderId(orderId);
    setError("");
    try {
      const result = await apiRequest(`/orders/${orderId}/shipping`, {
        method: "PATCH",
        body: JSON.stringify(shippingDraft),
      });
      setShippingEditOrderId("");
      setOrders((current) => current.map((item) => String(item._id || item.id) === String(orderId) ? result.data : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingOrderId("");
    }
  };

  const nextOrderStep = {
    pending: ["confirmed", "Confirm order"],
    confirmed: ["processing", "Start processing"],
    processing: ["shipped", "Mark shipped"],
    shipped: ["delivered", "Mark delivered"],
  };

  const renderShipping = (order) => {
    const orderId = order._id || order.id;
    const status = order.shippingStatus || "not_shipped";
    const statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return (
      <div className="order-shipping-cell">
        <span className={`order-shipping-status shipping-${status}`}>{statusLabel}</span>
        <span className="order-subtext"><strong>Location:</strong> {order.currentLocation || "Not updated"}</span>
        {order.trackingNumber && <span className="order-subtext"><strong>Tracking:</strong> {order.trackingNumber}</span>}
        {order.estimatedDelivery && <span className="order-subtext"><strong>ETA:</strong> {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
        {canManageShipping && shippingEditOrderId !== orderId && (
          <button className="order-shipping-edit" type="button" onClick={() => startShippingEdit(order)}>Update shipping</button>
        )}
        {canManageShipping && shippingEditOrderId === orderId && (
          <div className="order-shipping-form">
            <label><span>Shipping status</span><select value={shippingDraft.shippingStatus} onChange={(event) => setShippingDraft((draft) => ({ ...draft, shippingStatus: event.target.value }))}><option value="not_shipped">Not shipped</option><option value="shipped">Shipped</option><option value="in_transit">In transit</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option></select></label>
            <label><span>Current location</span><input value={shippingDraft.currentLocation} onChange={(event) => setShippingDraft((draft) => ({ ...draft, currentLocation: event.target.value }))} maxLength={200} placeholder="City or delivery hub" /></label>
            <label><span>Tracking number</span><input value={shippingDraft.trackingNumber} onChange={(event) => setShippingDraft((draft) => ({ ...draft, trackingNumber: event.target.value }))} maxLength={100} placeholder="Optional" /></label>
            <label><span>Estimated delivery</span><input type="date" value={shippingDraft.estimatedDelivery} onChange={(event) => setShippingDraft((draft) => ({ ...draft, estimatedDelivery: event.target.value }))} /></label>
            <div className="order-shipping-form-actions"><button className="order-action-complete" type="button" disabled={updatingOrderId === orderId} onClick={() => saveShippingUpdate(order)}>{updatingOrderId === orderId ? "Saving..." : "Save"}</button><button className="order-action-cancel" type="button" onClick={() => setShippingEditOrderId("")}>Cancel</button></div>
          </div>
        )}
      </div>
    );
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!selectedProductId) {
      setError("Select a product before creating an order.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest("/orders/", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName.trim() || "Walk-in Customer",
          notes: notes.trim(),
          items: [{ productId: selectedProductId, quantity: Number(quantity) }],
        }),
      });
      setSelectedProductId(""); setQuantity(1); setCustomerName(""); setNotes("");
      setShowForm(false);
      await fetchOrders();
      await onInventoryChanged?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="information-page order-page">
      <article className="information-card order-card">
        <div className="order-heading">
          <div>
            <div className="order-breadcrumb">Sales <span>â€º</span> Orders</div>
            <h2>Orders</h2>
            <p>Track order items, fulfillment, and the stock changes tied to each order.</p>
          </div>
          {canCreateOrders && (
            <button className="button button-primary order-add-button" type="button" onClick={() => setShowForm((shown) => !shown)}>
              <Plus size={16} /> {showForm ? "Close" : "Add order"}
            </button>
          )}
        </div>

        {error && <div className="standalone-error">{error}</div>}

        <div className="order-summary-grid" aria-label="Order summary">
          <div><span>Total orders</span><strong>{orders.length}</strong></div>
          <div><span>Pending</span><strong>{pendingCount}</strong></div>
          <div><span>Delivered</span><strong>{completedCount}</strong></div>
          <div><span>Units sold</span><strong>{soldUnits}</strong></div>
        </div>

        {canCreateOrders && showForm && <div className="order-create-panel">
          <div className="order-create-title"><ArrowDownUp size={17} /><div><strong>Create order</strong><span>Stock updates automatically when the order is saved.</span></div></div>
          <form className="form-grid" onSubmit={submitOrder}>
            <label><span>Customer</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in Customer" /></label>
            <label><span>Product</span><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}><option value="">Select product</option>{availableProducts.map((product) => <option key={product._id || product.id} value={product._id || product.id}>{product.name} ({product.quantity} in stock)</option>)}</select></label>
            <label><span>Quantity</span><input type="number" min="1" max={selectedProductId ? Math.max(1, Number(products.find((item) => (item._id || item.id) === selectedProductId)?.quantity || 1)) : 1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label>
            <label className="full-width"><span>Note</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Optional order note" /></label>
            <div className="form-actions full-width"><button className="button button-primary" type="submit" disabled={isSubmitting || !selectedProductId}>{isSubmitting ? "Saving..." : "Save order"}</button></div>
          </form>
        </div>}

        <div className="order-filters">
          <label><span>Customer / order</span><div className="order-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer or order" /></div></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label>
        </div>

        <div className="order-table-tools"><label>Show <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> entries</label><span>{filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}</span></div>

        {isLoading ? <div className="table-message">Loading orders...</div> : visibleOrders.length ? (
          <div className="order-table-wrap"><table className="order-data-table"><thead><tr><th>Customer</th><th>Order no.</th><th>Items</th><th>Ordered on</th><th>Amount</th><th>Shipping / location</th><th>Status / actions</th></tr></thead>
            <tbody>{visibleOrders.map((order) => <tr key={order._id || order.id}>
              <td data-label="Customer"><strong className="order-customer">{order.customerName || "Walk-in Customer"}</strong><span className="order-subtext">{order.notes || "â€”"}</span></td>
              <td className="order-number" data-label="Order number">#{String(order._id || order.id || "").slice(-8).toUpperCase()}</td>
              <td data-label="Items"><button className="order-items-toggle" type="button" aria-expanded={expandedOrderId === (order._id || order.id)} onClick={() => setExpandedOrderId(expandedOrderId === (order._id || order.id) ? "" : (order._id || order.id))}>{(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} unit(s) Â· {(order.items || []).length} product(s) {expandedOrderId === (order._id || order.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button><span className="order-subtext order-items-thumbs">{[(order.items || [])].map((item, index) => <span key={"thumb-" + index} className="order-item-thumb-row">{orderItemThumb(item, productById)}<span className="order-item-name">{item.productName || "Product"}</span></span>)}</span>{expandedOrderId === (order._id || order.id) && <div className="order-line-details"><strong>Order details</strong><div>{(order.items || []).map((item, index) => <div className="order-line-item" key={`${item.productId || item.productName}-${index}`}><span className="order-line-product">{orderItemThumb(item, productById)}</span><span className="order-line-name">{item.productName || "Product"}{item.productColor && <small className="order-line-color">Color: {item.productColor}</small>}{canManageShipping && <span className="order-item-image-upload"><input id={`order-item-image-${order._id || order.id}-${index}`} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadOrderItemImage(event, order, index)} disabled={uploadingItemKey === `${order._id || order.id}-${index}`} /><label htmlFor={`order-item-image-${order._id || order.id}-${index}`}><Camera size={12} />{uploadingItemKey === `${order._id || order.id}-${index}` ? "Uploadingâ€¦" : item.image ? "Replace image" : "Upload image"}</label></span>}</span><span>{item.quantity} x {money(item.price)}</span><strong>{money(Number(item.quantity || 0) * Number(item.price || 0))}</strong></div>)}</div>{(order.deliveryAddress || order.contactPhone) && <p>Delivery: {order.deliveryAddress || "Address not provided"}{order.contactPhone ? " / " + order.contactPhone : ""}</p>}{(order.shippingStatus || order.trackingNumber || order.currentLocation || order.estimatedDelivery) && <div><p><strong>Shipping status:</strong> {(order.shippingStatus || "not_shipped").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>{order.trackingNumber && <p><strong>Tracking:</strong> {order.trackingNumber}</p>}{order.currentLocation && <p><strong>Current location:</strong> {order.currentLocation}</p>}{order.estimatedDelivery && <p><strong>Estimated delivery:</strong> {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}</div>}<p>Stock was deducted when this order was created{order.status === "cancelled" ? " and restored when it was cancelled" : ""}.</p></div>}</td>
              <td data-label="Ordered on">{new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<span className="order-subtext">{new Date(order.createdAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></td>
              <td className="order-amount" data-label="Amount">{money(order.totalAmount)}</td>
              <td data-label="Shipping / location">{renderShipping(order)}</td>
              <td data-label="Status and actions"><span className={`order-status status-${order.status === "completed" ? "delivered" : order.status || "pending"}`}>{order.status === "completed" ? "delivered" : order.status || "pending"}</span><span className="order-subtext">{order.paymentMethod === "cash_on_delivery" ? "Cash on delivery" : "Payment not recorded"}</span>{canReorder && <button className="order-reorder-button" type="button" onClick={() => onReorder?.(order)}><ShoppingCart size={14} /> Reorder</button>}{canManageShipping && <div className="order-row-actions">{nextOrderStep[order.status] && <button className="order-action-complete" type="button" disabled={updatingOrderId === (order._id || order.id)} onClick={() => updateOrderStatus(order, nextOrderStep[order.status][0])}><BadgeCheck size={13} /> {nextOrderStep[order.status][1]}</button>}{!['cancelled', 'delivered', 'completed'].includes(order.status) && <button className="order-action-cancel" type="button" disabled={updatingOrderId === (order._id || order.id)} onClick={() => updateOrderStatus(order, "cancelled")}><Ban size={13} /> Cancel</button>}</div>}</td>
            </tr>)}</tbody></table></div>
        ) : <div className="order-empty"><PackageCheck size={25} /><strong>{orders.length ? "No matching orders" : "No orders yet"}</strong><span>{orders.length ? "Try another customer name or status." : "New orders will appear here after they are created."}</span></div>}
        <div className="order-footer"><span>Showing {visibleOrders.length ? (currentPage - 1) * pageSize + 1 : 0} to {(currentPage - 1) * pageSize + visibleOrders.length} of {filteredOrders.length} entries</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">â€¹</button><button type="button" className="is-current" aria-current="page">{currentPage}</button><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">â€º</button></div></div>
      </article>
    </section>
  );
}
