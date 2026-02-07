// Centralized API Configuration
// Ensure VITE_API_BASE_URL is set in .env for production
// e.g. https://franklin-backend.onrender.com

const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// Backend API (Node)
export const API_BASE_URL =
    cleanUrl(import.meta.env.VITE_API_BASE_URL) || (import.meta.env.PROD ? "" : "http://localhost:5002");

// Unified AI Service Defaults
const DEFAULT_AI_URL =
    cleanUrl(import.meta.env.VITE_AI_SERVICE_URL) || (import.meta.env.PROD ? "" : "http://localhost:8000");

// Export all model URLs
export const UNIFIED_MODEL_URL =
    cleanUrl(import.meta.env.VITE_UNIFIED_MODEL_URL) || DEFAULT_AI_URL;

export const DISEASE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_DISEASE_MODEL_URL) || DEFAULT_AI_URL;

export const SHORELINE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_SHORELINE_MODEL_URL) || DEFAULT_AI_URL;

export const HATCHERY_MODEL_URL =
    cleanUrl(import.meta.env.VITE_HATCHERY_MODEL_URL) || DEFAULT_AI_URL;

/**
 * PRODUCTION SAFE STREAMING ARCHITECTURE
 * HLS streams are served as static files from the backend /streams directory.
 */
export const getStreamUrl = (cameraId) => {
    if (!cameraId) return "";
    // If API_BASE_URL is not set, we use relative paths which work if hosted on same domain
    const base = API_BASE_URL || "";
    return `${base}/streams/${cameraId}/stream.m3u8`;
};

export const getHatcheryDataUrl = (tankId) => `${API_BASE_URL}/api/hatchery/data/${tankId}`;

// Generic API URL builder
export const getApiUrl = (endpoint) =>
    `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
