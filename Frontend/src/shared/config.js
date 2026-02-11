// Centralized API Configuration
// Ensure VITE_API_BASE_URL is set in .env for production
// e.g. https://franklin-backend-v0i3.onrender.com
// Ensure VITE_AI_SERVICE_URL is set in .env for production
// e.g. https://franklin-ai.onrender.com

const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// Backend API (Node)
export const API_BASE_URL =
    cleanUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5002";

// AI Service (FastAPI)
export const AI_BASE_URL =
    cleanUrl(import.meta.env.VITE_AI_SERVICE_URL) || "http://localhost:8000";

// Unified AI Service Defaults
// In the new unified architecture, all AI endpoints sit behind one URL.
// We allow individual overrides but default to the unified service URL.
const DEFAULT_AI_URL = AI_BASE_URL;

// Export all model URLs to satisfy imports across the frontend
export const UNIFIED_MODEL_URL =
    cleanUrl(import.meta.env.VITE_UNIFIED_MODEL_URL) || DEFAULT_AI_URL;

export const DISEASE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_DISEASE_MODEL_URL) || DEFAULT_AI_URL;

export const SHORELINE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_SHORELINE_MODEL_URL) || DEFAULT_AI_URL;

export const HATCHERY_MODEL_URL =
    cleanUrl(import.meta.env.VITE_HATCHERY_MODEL_URL) || DEFAULT_AI_URL;

// Helper to build consistent Stream/Data URLs (proxied via Backend)
export const getStreamUrl = (tankId) => `${API_BASE_URL}/stream/${tankId}`;
export const getHatcheryDataUrl = (tankId) => `${API_BASE_URL}/data/${tankId}`;

// Generic API URL builder
export const getApiUrl = (endpoint) =>
    `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// AI Service URL builder
export const getAiUrl = (endpoint) =>
    `${AI_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
