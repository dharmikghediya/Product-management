import React from "react";
import { createRoot } from "react-dom/client";
import ProductManagement from "./modules/products/ProductManagement.jsx";
import "./styles.css";
import "./brand-theme.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProductManagement />
  </React.StrictMode>,
);
