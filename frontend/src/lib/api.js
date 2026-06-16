import axios from "axios";

// Normalize the backend URL — always ensure it ends with /api
// This handles cases where REACT_APP_BACKEND_URL is set without /api
function buildApiBase() {
  const raw = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/api";
  // Strip any trailing slash, then ensure it ends with /api
  const stripped = raw.replace(/\/+$/, "");
  if (stripped.endsWith("/api")) return stripped;
  return stripped + "/api";
}

export const API_BASE = buildApiBase();

// eslint-disable-next-line no-console
console.log("API_BASE =", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("facets_token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;