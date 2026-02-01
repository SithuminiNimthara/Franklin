// Centralized API Configuration
// Ensure VITE_API_BASE_URL is set in .env for production
// e.g. https://franklin-backend.onrender.com

const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// Backend API (Node)
export const API_BASE_URL =
  cleanUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5002";

// Disease / AI service (FastAPI / unified AI)
export const DISEASE_MODEL_URL =
  cleanUrl(import.meta.env.VITE_DISEASE_MODEL_URL) || "http://localhost:8000";

// Helper to build consistent Stream/Data URLs (proxied via Backend)
export const getStreamUrl = (tankId) => `${API_BASE_URL}/stream/${tankId}`;
export const getHatcheryDataUrl = (tankId) => `${API_BASE_URL}/data/${tankId}`;

// Generic API URL builder
export const getApiUrl = (endpoint) =>
  `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
