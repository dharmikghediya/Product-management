import {
  Activity,
  BellRing,
  Boxes,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Image,
  MapPin,
  PackageCheck,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
  CirclePlus,
} from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "../productUtils.js";

const PAGE_COPY = {
  dashboard: ["Home", "Your inventory at a glance."],
  products: ["Products", "Search, review, and manage your store inventory."],
  cart: ["Your cart", "Review your selected products and place your order."],
  orders: ["Orders", "Track sales and automatic stock deductions."],
  stock: ["Stock history", "Review stock-in, stock-out, and order adjustments."],
  users: ["Users", "Manage app users and permissions."],
  categories: ["Categories", "Browse inventory by product category."],
  activity: ["Activity", "Review product changes made by your team."],
  about: ["About DG Tech Store", "A clearer way to organize and manage your inventory."],
  contact: ["Contact", "Get in touch with the DG Tech Store team."],
};

export function PageHeading({ view, canCreateProducts = true, onAddProduct }) {
  const [title, subtitle] = PAGE_COPY[view] || [view, ""];
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">DG TECH STORE / {view.toUpperCase()}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {(view === "products" || view === "categories") && canCreateProducts && (
        <div className="page-header-actions">
          <button className="button button-primary" type="button" onClick={onAddProduct}>
            <CirclePlus size={17} /> Add product
          </button>
        </div>
      )}
    </div>
  );
}

export function CategoryPage({ categories, canCreateProducts = true, onSelect, onAddProduct }) {
  return (
    <section className="information-page" aria-label="Product categories">
      {categories.length ? (
        <div className="category-cards">
          {categories.map((item) => (
            <button className="category-card" key={item.name} type="button" onClick={() => onSelect(item.name)}>
              <span className="category-card-icon"><Tags size={19} /></span>
              <strong>{item.name}</strong>
              <span>{item.productCount} {item.productCount === 1 ? "product" : "products"}</span>
              <span>Stock: {item.units} units</span>
              {item.lowStockCount > 0 && (
                <span className="category-low-stock">
                  {item.lowStockCount} below {LOW_STOCK_THRESHOLD} units
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="information-card information-empty">
          <Tags size={24} />
          <h2>No categories yet</h2>
          <p>Add products to see their categories here.</p>
          {canCreateProducts && (
            <button className="button button-primary" type="button" onClick={onAddProduct}>
              <CirclePlus size={16} /> Add product
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function AboutPage() {
  const sections = [
    {
      icon: Store,
      title: "Storefront and shopping",
      description: "A customer facing catalog for finding products, reviewing details, and placing orders.",
      features: [
        [PackageSearch, "Search and filter products by category, price, status, and stock"],
        [Image, "Product photos, gallery images, and video when provided"],
        [Tags, "Color, size, and configuration choices when set up for a product"],
        [ClipboardList, "Product descriptions, specifications, brand, model, and price"],
        [ShoppingCart, "Add items to the cart, adjust quantities, and check out"],
        [RotateCcw, "Reorder available items from previous orders"],
      ],
    },
    {
      icon: Boxes,
      title: "Product catalog",
      description: "Keep product information organized so customers and staff can identify each item.",
      features: [
        [Tags, "Categories, product names, brands, and model information"],
        [Image, "Images and video attached to product listings"],
        [ClipboardList, "Technical specifications and product descriptions"],
        [PackageCheck, "Selling price, available quantity, and stock status"],
      ],
    },
    {
      icon: ChartNoAxesColumnIncreasing,
      title: "Inventory and stock control",
      description: "See stock health and follow quantity changes across the catalog.",
      features: [
        [PackageCheck, "In stock, low stock, and out of stock visibility"],
        [Activity, "Stock movement history and order related deductions"],
        [MapPin, "Record and review shelf or storage locations when entered"],
        [ChartNoAxesColumnIncreasing, "Dashboard summaries for products and inventory"],
      ],
    },
    {
      icon: Truck,
      title: "Orders and delivery",
      description: "Follow each order from placement through delivery, with shipping details in one view.",
      features: [
        [ClipboardList, "Pending, confirmed, processing, shipped, delivered, and cancelled statuses"],
        [MapPin, "Shipping location, tracking number, and estimated delivery"],
        [BellRing, "Notifications when an order status is updated"],
        [ShoppingCart, "Customer order history and reorder access"],
      ],
    },
    {
      icon: ShieldCheck,
      title: "Team and store management",
      description: "Administrative tools help your team manage the workspace and its records.",
      features: [
        [Users, "User accounts and role based access"],
        [Tags, "Manage and browse product categories"],
        [Activity, "Review product and inventory activity"],
        [ShieldCheck, "Keep store and account settings under administrator control"],
      ],
    },
  ];

  return (
    <section className="information-page about-page">
      <article className="information-card about-card">
        <span className="information-card-icon"><Boxes size={22} /></span>
        <span className="eyebrow">DG TECH STORE / STORE OVERVIEW</span>
        <h2>Everything your store needs, in one place.</h2>
        <p>DG Tech Store brings your online product catalog, inventory, and order operations together. Keep product information clear for shoppers while giving your team the tools to track stock and fulfill orders.</p>
        <div className="about-overview-points">
          <span><PackageSearch size={17} /> Product catalog and detailed listings</span>
          <span><ChartNoAxesColumnIncreasing size={17} /> Stock visibility and movement history</span>
          <span><Truck size={17} /> Order fulfillment and delivery updates</span>
        </div>
      </article>

      <div className="about-section-grid">
        {sections.map(({ icon: SectionIcon, title, description, features }) => (
          <article className="information-card about-section-card" key={title}>
            <span className="about-section-icon"><SectionIcon size={19} /></span>
            <h3>{title}</h3>
            <p>{description}</p>
            <ul>
              {features.map(([FeatureIcon, label]) => (
                <li key={label}><FeatureIcon size={15} /><span>{label}</span></li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContactPage() {
  return (
    <section className="information-page">
      <article className="information-card contact-card">
        <span className="eyebrow">SUPPORT</span>
        <h2>Contact DG Tech Store</h2>
        <p>For help with your account or inventory, contact your DG Tech Store administrator.</p>
        <div className="contact-details">
          <div className="contact-detail">
            <span className="contact-detail-icon"><ShieldCheck size={17} /></span>
            <div>
              <span>Account access and permissions</span>
              <strong>Contact your DG Tech Store administrator</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
