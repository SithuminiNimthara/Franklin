// Centralized API Configuration
// Ensure VITE_API_BASE_URL is set in .env for production
// e.g. https://franklin-backend.onrender.com

const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// The root URL of the backend service (e.g. https://franklin-backend.onrender.com)
export const BACKEND_URL = cleanUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5002";

// Backend API Base (specifically for business logic routes)
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Unified AI Service Defaults
const DEFAULT_AI_URL = cleanUrl(import.meta.env.VITE_AI_SERVICE_URL) || "http://localhost:8000";

export const UNIFIED_MODEL_URL = cleanUrl(import.meta.env.VITE_UNIFIED_MODEL_URL) || DEFAULT_AI_URL;
export const DISEASE_MODEL_URL = cleanUrl(import.meta.env.VITE_DISEASE_MODEL_URL) || DEFAULT_AI_URL;
export const SHORELINE_MODEL_URL = cleanUrl(import.meta.env.VITE_SHORELINE_MODEL_URL) || DEFAULT_AI_URL;
export const HATCHERY_MODEL_URL = cleanUrl(import.meta.env.VITE_HATCHERY_MODEL_URL) || DEFAULT_AI_URL;

// Corrected Stream/Data URLs (proxied via Backend root or /api appropriately)
export const getStreamUrl = (cameraId) => `${BACKEND_URL}/streams/${cameraId}/stream.m3u8`;
export const getHatcheryDataUrl = (tankId) => `${API_BASE_URL}/data/${tankId}`;

// Generic API URL builder
export const getApiUrl = (endpoint) =>
    `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
