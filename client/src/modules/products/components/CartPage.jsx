import { useState } from "react";
import { ArrowLeft, CheckCircle2, Minus, Plus, Printer, ShoppingBag, Trash2 } from "lucide-react";
import { currency, getProductId } from "../productUtils.js";
import BrandMark from "./BrandMark.jsx";
import { calculateProductOffer } from "../offerUtils.js";

export default function CartPage({ items, customerName: initialCustomerName = "", onQuantityChange, onRemove, onContinueShopping, onCheckout }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => sum + calculateProductOffer(item, item.quantity).totalSavings, 0);
  const total = Math.max(0, subtotal - totalSavings);

  const placeOrder = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await onCheckout(items, {
        customerName: customerName.trim(),
        deliveryAddress: deliveryAddress.trim(),
        contactPhone: contactPhone.trim(),
        paymentMethod: "cash_on_delivery",
      });
      setCompletedOrder(result);
    } catch (checkoutError) {
      setError(checkoutError.message || "Could not place the order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedOrder) {
    const orderNumber = String(completedOrder._id || completedOrder.id || "").slice(-8).toUpperCase();
    const billedItems = Array.isArray(completedOrder.items) ? completedOrder.items : [];
    const billSubtotal = billedItems.reduce((sum, item) => sum + Number(item.listPrice ?? (Number(item.price || 0) + Number(item.discount || 0))) * Number(item.quantity || 0), 0);
    const billDiscount = Number(completedOrder.totalDiscount) || billedItems.reduce((sum, item) => sum + Number(item.discount || 0) * Number(item.quantity || 0), 0);
    const orderDate = completedOrder.createdAt
      ? new Date(completedOrder.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    return (
      <section className="cart-page">
        <div className="cart-success-card cart-order-success">
          <span className="cart-success-icon print-hidden"><ShoppingBag size={23} /></span>
          <span className="eyebrow print-hidden">ORDER PLACED</span>
          <h2 className="print-hidden">Thank you for your purchase</h2>
          <p className="print-hidden">Your order is pending. Pay cash when it is delivered.</p>
          <div className="cart-order-notice print-hidden" role="status"><CheckCircle2 size={18} /><span>Order placed successfully. Payment is due when your order is delivered.</span></div>
          <article className="cart-invoice">
            <header className="cart-invoice-header">
              <div className="cart-invoice-brand-group">
                <span className="cart-invoice-logo"><BrandMark className="brand-mark-art" /></span>
                <div className="cart-invoice-brand-copy"><strong>DG</strong><span className="cart-invoice-brand-subtitle">TECH STORE &amp; INVENTORY</span><h1>Order bill</h1></div>
              </div>
              <div><strong>Order #{orderNumber}</strong><span>{orderDate}</span></div>
            </header>
            <div className="cart-invoice-meta">
              <div><span>Delivery name</span><strong>{completedOrder.customerName || "Customer"}</strong></div>
              <div><span>Payment method</span><strong>Cash on delivery</strong></div>
              <div><span>Delivery address</span><strong>{completedOrder.deliveryAddress || "Not provided"}</strong></div>
              <div><span>Contact phone</span><strong>{completedOrder.contactPhone || "Not provided"}</strong></div>
            </div>
            <div className="cart-invoice-items">
              <div className="cart-invoice-row cart-invoice-table-heading"><span>Item</span><span>Qty</span><span>Unit price</span><span>Discount</span><span>Amount</span></div>
              {billedItems.map((item, index) => (
                <div className="cart-invoice-row" key={`${item.productId || item.productName}-${index}`}>
                  <span>{item.productName || "Product"}{item.productColor && <small className="cart-invoice-color">Color: {item.productColor}</small>}{item.offerTitle && <small className="cart-invoice-color">{item.offerTitle}</small>}</span>
                  <span>{item.quantity}</span>
                  <span>{currency.format(Number(item.listPrice ?? (Number(item.price || 0) + Number(item.discount || 0))) || 0)}</span>
                  <strong className="cart-invoice-item-discount">{Number(item.discount) > 0 ? `-${currency.format(Number(item.discount) * Number(item.quantity || 0))}` : "—"}</strong>
                  <strong>{currency.format(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                </div>
              ))}
            </div>
            <div className="cart-invoice-total"><span>Subtotal</span><strong>{currency.format(billSubtotal)}</strong></div>
            {billDiscount > 0 && <div className="cart-invoice-total cart-invoice-savings"><span>Offer discount</span><strong>-{currency.format(billDiscount)}</strong></div>}
            <div className="cart-invoice-total"><span>Total due on delivery</span><strong>{currency.format(Number(completedOrder.totalAmount) || 0)}</strong></div>
            <p className="cart-invoice-note">Please pay the delivery agent in cash when your order arrives.</p>
          </article>
          <div className="cart-invoice-actions print-hidden">
            <button className="button button-secondary" type="button" onClick={() => window.print()}><Printer size={16} /> Print / Save bill</button>
            <button className="button button-primary" type="button" onClick={onContinueShopping}>Continue shopping</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <button className="button button-quiet cart-back" type="button" onClick={onContinueShopping}><ArrowLeft size={15} /> Continue shopping</button>
      <div className="cart-layout">
        <section className="cart-items-card">
          <div className="cart-title-row"><div><h2>Your cart</h2><p>{items.length} {items.length === 1 ? "product" : "products"} selected</p></div></div>
          {items.length ? items.map((item) => {
            const id = getProductId(item);
            const stock = Math.max(0, Number(item.quantityInStock) || 0);
            const offerPricing = calculateProductOffer(item, item.quantity);
            return (
              <article className="cart-item" key={id}>
                <div className="cart-item-mark" aria-hidden="true">{item.image ? <img src={item.image} alt="" /> : <ShoppingBag size={19} />}</div>
                <div className="cart-item-copy"><strong>{item.name}</strong>{item.color && <span>Color: {item.color}</span>}<span>{item.category || "Product"} · {currency.format(offerPricing.pricePerUnit)} each{offerPricing.offer && <del className="cart-item-old-price">{currency.format(Number(item.price) || 0)}</del>}</span>{offerPricing.offer && <small className="cart-item-offer">{offerPricing.offer.title} · save {currency.format(offerPricing.totalSavings)}</small>}<small>{stock} available</small></div>
                <div className="cart-item-controls">
                  <div className="cart-quantity" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" onClick={() => onQuantityChange(id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={`Remove one ${item.name}`}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onQuantityChange(id, item.quantity + 1)} disabled={item.quantity >= stock} aria-label={`Add one ${item.name}`}><Plus size={14} /></button>
                  </div>
                  <strong className="cart-line-total">{currency.format(offerPricing.pricePerUnit * item.quantity)}</strong>
                </div>
                <button className="cart-remove" type="button" onClick={() => onRemove(id)} aria-label={`Remove ${item.name} from cart`}><Trash2 size={16} /></button>
              </article>
            );
          }) : (
            <div className="cart-empty"><ShoppingBag size={27} /><strong>Your cart is empty</strong><span>Browse the catalogue and add a product to get started.</span><button className="button button-secondary" type="button" onClick={onContinueShopping}>Browse products</button></div>
          )}
        </section>

        <aside className="cart-summary-card">
          <h3>Order summary</h3>
          <div className="cart-summary-line"><span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span><strong>{currency.format(subtotal)}</strong></div>
          {totalSavings > 0 && <div className="cart-summary-line cart-summary-savings"><span>Offers saved</span><strong>−{currency.format(totalSavings)}</strong></div>}
          <div className="cart-summary-line"><span>Delivery</span><strong>Free</strong></div>
          <div className="cart-summary-total"><span>Total</span><strong>{currency.format(total)}</strong></div>
          <div className="cart-delivery-fields">
            <label>Delivery name<input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" placeholder="Name of the person receiving the order" required /></label>
            <label>Delivery address<textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} rows={3} minLength={10} maxLength={500} placeholder="Enter your complete delivery address" required /></label>
            <label>Contact phone<input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} minLength={7} maxLength={20} pattern="[+0-9() -]{7,20}" placeholder="Phone number for delivery" required /></label>
          </div>
          <div className="cart-payment-method"><span>Payment method</span><strong>Cash on delivery</strong><small>Pay the delivery agent when your order arrives.</small></div>
          {error && <p className="cart-error" role="alert">{error}</p>}
          <button className="button button-primary cart-checkout" type="button" onClick={placeOrder} disabled={!items.length || isSubmitting || customerName.trim().length < 2 || deliveryAddress.trim().length < 10 || !/^[+0-9() -]{7,20}$/.test(contactPhone.trim()) || contactPhone.replace(/\D/g, "").length < 7}>
            {isSubmitting ? "Placing order…" : "Place order"}
          </button>
          <p className="cart-payment-note">Enter your delivery address and phone number to continue. Pay in cash when your order arrives.</p>
        </aside>
      </div>
    </section>
  );
}
