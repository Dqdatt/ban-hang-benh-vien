import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import CustomerDisplay from "./CustomerDisplay.jsx";

// Kiểm tra tham số trên URL để quyết định hiển thị màn hình nào
const isCustomerScreen = window.location.search.includes(
  "customer_screen=true",
);

createRoot(document.getElementById("root")).render(
  <StrictMode>{isCustomerScreen ? <CustomerDisplay /> : <App />}</StrictMode>,
);
