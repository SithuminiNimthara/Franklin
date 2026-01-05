// shorelineApi.js

const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// ✅ normalize base (prevents ":8000" and missing protocol)
export const API_BASE = (() => {
  let b = String(RAW_BASE || "").trim();

  if (b.startsWith(":")) b = `http://localhost${b}`;
  if (b && !b.startsWith("http://") && !b.startsWith("https://")) {
    b = `http://${b}`;
  }
  if (!b) b = "http://localhost:8000";

  return b.replace(/\/+$/, "");
})();

// ✅ safe response reader
async function safeBody(res) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

// ---------------------
// Boundary
// ---------------------
export async function getBoundary() {
  const res = await fetch(`${API_BASE}/api/shoreline/boundary`);
  const { json, text } = await safeBody(res);

  if (!res.ok) {
    throw new Error(json?.detail || text || "Failed to load boundary");
  }
  return json;
}

// ---------------------
// Nests
// ---------------------
export async function getNests() {
  const res = await fetch(`${API_BASE}/api/shoreline/nests`);
  const { json, text } = await safeBody(res);

  if (!res.ok) {
    throw new Error(json?.detail || text || "Failed to load nests");
  }
  return json;
}

// ---------------------
// Alerts
// ---------------------
export async function getAlerts() {
  const res = await fetch(`${API_BASE}/api/shoreline/alerts`);
  const { json, text } = await safeBody(res);

  if (!res.ok) {
    throw new Error(json?.detail || text || "Failed to load alerts");
  }
  return json;
}

// ---------------------
// Offline Evaluation
// ---------------------
export async function evaluateOffline(file, bufferPct = 3) {
  const form = new FormData();

  // ✅ MUST be "file" (matches multer)
  form.append("file", file, file.name);

  const url = `${API_BASE}/api/shoreline/evaluate-offline?bufferPct=${bufferPct}`;
  console.log("POST:", url);

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  const { json, text } = await safeBody(res);

  if (!res.ok) {
    console.error("evaluateOffline failed:", res.status, text);
    throw new Error(json?.detail || text || "Offline evaluation failed");
  }

  return json;
}
