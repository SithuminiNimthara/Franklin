// Config updated to prevent direct AI calls
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";
// These should ideally be proxied via backend, but if needed:
export const UNIFIED_MODEL_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
export const DISEASE_MODEL_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
export const SHORELINE_MODEL_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
export const HATCHERY_MODEL_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
