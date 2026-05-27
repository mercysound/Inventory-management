// ── buildInvoiceUrl.js ───────────────────────────────────────────────────────
// Shared helper — import this wherever you need to build a receipt/invoice URL.
// Place this file in: src/utils/buildInvoiceUrl.js
//
// WHY THIS EXISTS:
// axiosInstance.defaults.baseURL is typically "/api" (a relative path).
// When used as an iframe src, a relative path like "/api/orders/invoice?..."
// gets intercepted by React Router and matched as a frontend route — which
// fails with "No routes matched location".
// We need an ABSOLUTE URL (https://yourserver.com/api/orders/invoice?...)
// so the browser sends a real HTTP request directly to the backend server,
// completely bypassing React Router.

import axiosInstance from "./axiosInstance";

const buildInvoiceUrl = (params) => {
  const token = localStorage.getItem("pos-token") || "";

  // Get the baseURL from axiosInstance (e.g. "/api" or "https://api.example.com/api")
  const configuredBase = axiosInstance.defaults.baseURL || "/api";

  // If it's already absolute (starts with http), use it directly.
  // If it's relative (starts with /), prefix with the current window origin
  // so the iframe gets a full absolute URL and React Router is bypassed.
  const absoluteBase = configuredBase.startsWith("http")
    ? configuredBase
    : window.location.origin + configuredBase;

  const qs = new URLSearchParams({ ...params, token }).toString();
  return `${absoluteBase}/orders/invoice?${qs}`;
};

export default buildInvoiceUrl;