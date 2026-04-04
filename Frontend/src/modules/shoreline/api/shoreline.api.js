import { API_BASE_URL as API_BASE } from "../../../shared/config";

async function readSafeResponse(response) {
  const text = await response.text();

  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

async function handleResponse(response, fallbackMessage) {
  const { json, text } = await readSafeResponse(response);

  if (!response.ok) {
    throw new Error(json?.detail || text || fallbackMessage);
  }

  return json;
}

// Boundary
export async function fetchBoundary() {
  const response = await fetch(`${API_BASE}/api/shoreline/boundary`);
  return handleResponse(response, "Failed to load boundary");
}

// Nests
export async function fetchNests() {
  const response = await fetch(`${API_BASE}/api/shoreline/nests`);
  return handleResponse(response, "Failed to load nests");
}

// Alerts
export async function fetchAlerts(limit = 50, page = 1) {
  const response = await fetch(
    `${API_BASE}/api/shoreline/alerts?limit=${limit}&page=${page}`,
  );

  return handleResponse(response, "Failed to load alerts");
}

export async function acknowledgeShorelineAlert(id, staff = "Ranger-01") {
  const response = await fetch(`${API_BASE}/api/shoreline/alerts/${id}/ack`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staff }),
  });

  return handleResponse(response, "Acknowledge failed");
}

export async function resolveShorelineAlert(id, staff = "Ranger-01") {
  const response = await fetch(
    `${API_BASE}/api/shoreline/alerts/${id}/resolve`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff }),
    },
  );

  return handleResponse(response, "Resolve failed");
}

// Offline image evaluation
export async function evaluateOffline(file, bufferPct = 5, token) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch(
    `${API_BASE}/api/shoreline/evaluate-offline?bufferPct=${bufferPct}`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  return handleResponse(response, "Offline evaluation failed");
}

// Video prediction
export async function predictVideo(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch(`${API_BASE}/api/shoreline/predict-video`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response, "Video prediction failed");
}

// Demo video
export async function predictDemoVideo(name = "shoreline_demo.mp4") {
  const response = await fetch(
    `${API_BASE}/api/shoreline/predict-video-demo?name=${encodeURIComponent(name)}`,
  );

  return handleResponse(response, "Demo video prediction failed");
}

// Environment
export async function fetchCurrentEnvironment() {
  const response = await fetch(`${API_BASE}/api/environment/current`);
  return handleResponse(response, "Failed to load environment");
}

export async function saveManualEnvironment(payload) {
  const response = await fetch(`${API_BASE}/api/environment/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse(response, "Failed to save manual environment");
}

// Video evaluation
export async function evaluateVideo(file, bufferPct = 3, token) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch(
    `${API_BASE}/api/shoreline/evaluate-video?bufferPct=${bufferPct}`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  return handleResponse(response, "Video evaluation failed");
}
