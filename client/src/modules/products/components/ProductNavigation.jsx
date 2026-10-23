import {
  Activity,
  Boxes,
  Bell,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Info,
  Mail,
  KeyRound,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  ShoppingCart,
  ShieldCheck,
  Tags,
  ArrowDownUp,
  Users,
  Truck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChangePasswordDialog from "../../auth/ChangePasswordDialog.jsx";
import BrandMark from "./BrandMark.jsx";

export function AppHeader({
  session,
  isSidebarOpen,
  onToggleSidebar,
  onSignOut,
  onNavigate,
  isStorefront = false,
}) {
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const notificationStorageKey = `stockroom-notifications-${session.user?.id || session.user?._id || "account"}`;
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(notificationStorageKey) || "[]"); }
    catch { return []; }
  });
  const [isNotificationPopupOpen, setIsNotificationPopupOpen] = useState(false);
  const accountPopupRef = useRef(null);
  const notificationPopupRef = useRef(null);
  const displayedRole =
    session.user?.role === "admin"
      ? "Admin"
      : session.user?.role === "vendor"
        ? "Vendor"
        : session.user?.role === "staff" || session.user?.role === "manager"
          ? "Staff"
          : "User";

  useEffect(() => {
    if (!isAccountPopupOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!accountPopupRef.current?.contains(event.target)) setIsAccountPopupOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAccountPopupOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountPopupOpen]);

  useEffect(() => {
    try { localStorage.setItem(notificationStorageKey, JSON.stringify(notifications.slice(0, 30))); }
    catch { /* Keep notifications in memory when storage is unavailable. */ }
  }, [notificationStorageKey, notifications]);

  useEffect(() => {
    if (!session?.token) return undefined;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(session.token)}`;
    let socket;
    let reconnectTimer;
    let startupTimer;
    let isDisposed = false;
    let reconnectDelay = 1000;

    const connect = () => {
      if (isDisposed) return;
      socket = new WebSocket(socketUrl);
      socket.onopen = () => { reconnectDelay = 1000; };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.event !== "order.notification" || !message.data?.id) return;
          const notification = { ...message.data, read: false };
          setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 30));
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification("Order update", { body: notification.message });
          }
        } catch { /* Ignore unrelated or malformed socket messages. */ }
      };
      socket.onclose = () => {
        if (isDisposed) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };

    // Strict Mode mounts, cleans up, and remounts effects in development.
    // Deferring connection creation avoids opening a socket that cleanup
    // immediately aborts while the Vite proxy handshake is still in flight.
    startupTimer = window.setTimeout(connect, 250);
    return () => {
      isDisposed = true;
      window.clearTimeout(startupTimer);
      window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Session changed");
    };
  }, [session?.token]);

  useEffect(() => {
    if (!isNotificationPopupOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!notificationPopupRef.current?.contains(event.target)) setIsNotificationPopupOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsNotificationPopupOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationPopupOpen]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const markNotificationsRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

  return (
    <header className="site-header">
      <div className="header-brand-group">
        {!isStorefront && <button
          className="sidebar-toggle"
          type="button"
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isSidebarOpen}
          aria-controls="main-navigation"
          onClick={onToggleSidebar}
        >
          <Menu size={19} />
        </button>}
        <a className="brand brand-stacked" href="/" aria-label="DG Tech Store and Inventory home">
          <span className="brand-mark brand-initials"><BrandMark className="brand-mark-art" /></span>
          <span className="brand-name"><span>DG</span><span>TECH STORE &amp; INVENTORY</span></span>
        </a>
      </div>
      <div className="session-controls">
        <div className="notification-menu" ref={notificationPopupRef}>
          <button className="notification-trigger" type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={isNotificationPopupOpen} onClick={() => setIsNotificationPopupOpen((open) => !open)}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
          {isNotificationPopupOpen && <section className="notification-popup" role="dialog" aria-label="Notifications">
            <div className="notification-popup-heading"><strong>Notifications</strong>{notifications.length > 0 && <button type="button" onClick={markNotificationsRead}>Mark all read</button>}</div>
            {notifications.length ? <div className="notification-list">{notifications.map((notification) => <button className={`notification-item ${notification.read ? "is-read" : "is-unread"}`} type="button" key={notification.id} onClick={() => { setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item)); setIsNotificationPopupOpen(false); onNavigate?.(isStorefront ? "my-orders" : "orders"); }}><span className="notification-item-title">Order #{notification.orderNumber || String(notification.orderId || "").slice(-8).toUpperCase()}</span><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></button>)}</div> : <div className="notification-empty">Order updates will appear here.</div>}
          </section>}
        </div>
        <div className="account-menu" ref={accountPopupRef}>
          <button
            className="session-role session-account-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isAccountPopupOpen}
            onClick={() => setIsAccountPopupOpen((isOpen) => !isOpen)}
          >
            <span className="session-account-role">{displayedRole}</span>
            <ChevronDown size={12} />
          </button>
          {isAccountPopupOpen && (
            <section
              className="account-popup"
              role="dialog"
              aria-label="Account details"
            >
              <span className="account-popup-kicker">SIGNED-IN ACCOUNT</span>
              <strong className="account-popup-name">
                {session.user?.name || "Account"}
              </strong>
              <span className="account-popup-email">
                {session.user?.email || ""}
              </span>
              <div className="account-popup-divider" />
              <div className="account-popup-detail">
                <span>Account role</span>
                <strong>
                  <ShieldCheck size={15} /> {displayedRole}
                </strong>
              </div>
              <button
                className="account-popup-action"
                type="button"
                onClick={() => {
                  setIsAccountPopupOpen(false);
                  setIsChangePasswordOpen(true);
                }}
              >
                <KeyRound size={15} />
                Change password
              </button>
              <button
                className="account-popup-action account-popup-signout"
                type="button"
                onClick={() => {
                  setIsAccountPopupOpen(false);
                  onSignOut();
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </section>
          )}
        </div>
      </div>
      {isChangePasswordOpen && (
        <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </header>
  );
}

export function StorefrontNavigation({ activeView, cartCount = 0, onNavigate, onOpenCategories }) {
  return (
    <nav className="storefront-navigation" aria-label="Shop navigation">
      <button className={activeView === "products" ? "is-active" : ""} type="button" onClick={() => onNavigate("products")}>
        <PackageSearch size={16} /> Shop
      </button>
      <button className={activeView === "categories" ? "is-active" : ""} type="button" onClick={onOpenCategories}>
        <Tags size={16} /> Categories
      </button>
      {cartCount > 0 && <button className={activeView === "cart" ? "is-active" : ""} type="button" onClick={() => onNavigate("cart")}>
        <ShoppingCart size={16} /> Cart <span key={cartCount} className="cart-count-bump">{cartCount}</span>
      </button>}
      <button className={activeView === "my-orders" ? "is-active" : ""} type="button" onClick={() => onNavigate("my-orders")}>
        <Truck size={16} /> My Orders
      </button>
    </nav>
  );
}

export default function ProductSidebar({
  activeView,
  isCategoryDialogOpen,
  productCount,
  canViewActivity = true,
  canManageUsers = false,
  canViewOperations = true,
  canPurchase = false,
  cartCount = 0,
  onNavigate,
  onOpenCategories,
}) {
  const links = [
    ...(!canViewOperations
      ? []
      : [
          {
            view: "dashboard",
            label: "Home",
            icon: ChartNoAxesColumnIncreasing,
          },
        ]),
    {
      view: "products",
      label: "Products",
      icon: PackageSearch,
      count: productCount,
    },
    ...(canPurchase ? [{ view: "cart", label: "Cart", icon: ShoppingCart, count: cartCount }] : []),
    ...(canViewOperations
      ? [
          { view: "orders", label: "Orders", icon: ArrowDownUp },
          { view: "stock", label: "Stock", icon: Package },
        ]
      : []),
    ...(canViewActivity
      ? [{ view: "activity", label: "Activity", icon: Activity }]
      : []),
    ...(canManageUsers ? [{ view: "users", label: "Users", icon: Users }] : []),
    {
      view: "categories",
      label: "Categories",
      icon: Tags,
      onClick: onOpenCategories,
    },
    { view: "about", label: "About", icon: Info },
    { view: "contact", label: "Contact", icon: Mail },
  ];

  return (
    <nav
      className="primary-navigation"
      id="main-navigation"
      aria-label="Main navigation"
    >
      <div className="navigation-section-label">Workspace</div>
      <div className="primary-navigation-inner">
        {links.map(({ view, label, icon: Icon, count, onClick }) => (
          <button
            className={`navigation-item ${activeView === view || (view === "categories" && isCategoryDialogOpen) ? "is-active" : ""}`}
            key={view}
            type="button"
            aria-label={label}
            title={label}
            aria-current={
              activeView === view ||
              (view === "categories" && isCategoryDialogOpen)
                ? "page"
                : undefined
            }
            onClick={onClick || (() => onNavigate(view))}
          >
            <Icon size={17} />
            {label}
            {count !== undefined && (
              <span className="navigation-count">{count}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
