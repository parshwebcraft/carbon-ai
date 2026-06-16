import axios from "axios";

export const API_BASE =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/api";

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