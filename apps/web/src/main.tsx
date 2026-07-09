import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error("app root not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);