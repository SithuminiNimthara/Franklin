// ==============================
// Franklin Centralized API Config
// ==============================

// Clean trailing slash
const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

/**
 * ENVIRONMENT VARIABLES (Required in Render)
 * Frontend Service:
 * - VITE_API_BASE_URL: https://franklin-backend-v0i3.onrender.com
 * - VITE_AI_BASE_URL: https://franklin-ai.onrender.com
 */

const IS_PROD = !import.meta.env.DEV;

// Node Backend (Express)
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const API_BASE_URL = cleanUrl(RAW_API_BASE) || (IS_PROD ? "" : "http://localhost:5002");

if (IS_PROD && !API_BASE_URL) {
  console.error("CRITICAL: VITE_API_BASE_URL is missing in production!");
}

// AI Backend (FastAPI)
const RAW_AI_BASE = import.meta.env.VITE_AI_BASE_URL || "";
export const AI_BASE_URL = cleanUrl(RAW_AI_BASE) || (IS_PROD ? "" : "http://localhost:8000");

if (IS_PROD && !AI_BASE_URL) {
  console.error("CRITICAL: VITE_AI_BASE_URL is missing in production!");
}

// ------------------------------
// Model URLs (Forward Compatibility)
// ------------------------------
export const UNIFIED_MODEL_URL = AI_BASE_URL;
export const DISEASE_MODEL_URL = AI_BASE_URL;
export const SHORELINE_MODEL_URL = AI_BASE_URL;
export const HATCHERY_MODEL_URL = AI_BASE_URL;

// ------------------------------
// URL Builders
// ------------------------------

/**
 * Ensures endpoints have the /api prefix for Node Backend
 * unless it's a static route like /streams/
 */
export const getApiUrl = (endpoint) => {
  if (!API_BASE_URL && IS_PROD) return "#";
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Auto-prefix /api if not present and not a static path
  const needsPrefix = !path.startsWith("/api") &&
    !path.startsWith("/streams") &&
    !path.startsWith("/content");

  const finalPath = needsPrefix ? `/api${path}` : path;
  return `${API_BASE_URL}${finalPath}`;
};

/**
 * Generic AI API builder
 */
export const getAiUrl = (endpoint) => {
  if (!AI_BASE_URL && IS_PROD) return "#";
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${AI_BASE_URL}${path}`;
};

// Tank stream URL (MJPEG proxy via Backend)
export const getStreamUrl = (tankId) =>
  getApiUrl(`/streaming/proxy/${tankId}`);

// Hatchery data URL
export const getHatcheryDataUrl = (tankId) =>
  getApiUrl(`/hatchery/stats/${tankId}`);

// HLS Stream URL (Static via Backend)
export const getHlsStreamUrl = (cameraId) =>
  `${API_BASE_URL}/streams/${cameraId}/stream.m3u8`;
