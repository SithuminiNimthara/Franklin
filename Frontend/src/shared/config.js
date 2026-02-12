// ==============================
// Franklin Centralized API Config
// ==============================

// Clean trailing slash
const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// ------------------------------
// ENV VARIABLES
// ------------------------------
// These MUST be set in Render (Frontend Service):
// VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com
// VITE_AI_BASE_URL=https://franklin-ai.onrender.com

// Node Backend (Express)
const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "";

export const API_BASE_URL =
  cleanUrl(RAW_API_BASE) ||
  (import.meta.env.DEV ? "http://localhost:5002" : "");

// AI Backend (FastAPI)
const RAW_AI_BASE =
  import.meta.env.VITE_AI_BASE_URL || "";

export const AI_BASE_URL =
  cleanUrl(RAW_AI_BASE) ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

// ------------------------------
// Model URLs (All use AI base)
// ------------------------------

export const UNIFIED_MODEL_URL = AI_BASE_URL;
export const DISEASE_MODEL_URL = AI_BASE_URL;
export const SHORELINE_MODEL_URL = AI_BASE_URL;
export const HATCHERY_MODEL_URL = AI_BASE_URL;

// ------------------------------
// Backend Route Builders
// ------------------------------

// Generic Node API builder
export const getApiUrl = (endpoint) =>
  `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// Generic AI API builder
export const getAiUrl = (endpoint) =>
  `${AI_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// Tank stream URL (Node backend must implement this)
export const getStreamUrl = (tankId) =>
  `${API_BASE_URL}/streams/${tankId}/stream.m3u8`;

// Hatchery data URL
export const getHatcheryDataUrl = (tankId) =>
  `${API_BASE_URL}/data/${tankId}`;
