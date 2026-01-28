import EnvironmentReading from "../models/environment.model.js";

// Node 18+ has global fetch; otherwise install node-fetch.
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "";
const DEFAULT_LOCATION = process.env.ENV_LOCATION || "Colombo,LK";

/**
 * Example: Rain from a weather API (choose any provider you like).
 * This function returns null if API is not configured / fails.
 */
export async function fetchEnvFromApi() {
  if (!WEATHER_API_KEY) return null;

  try {
    // ✅ Replace this URL with your chosen provider endpoint.
    // Keep it as a placeholder in your thesis if you don’t want to lock provider.
    const url = `https://api.example.com/weather?key=${WEATHER_API_KEY}&q=${encodeURIComponent(
      DEFAULT_LOCATION,
    )}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();

    // Map provider response → our schema (example only)
    const rainLast3h = Number(data?.rain?.last3h_mm ?? null);
    const rainNext6h = Number(data?.rain?.next6h_mm ?? null);

    return {
      source: "api",
      station: DEFAULT_LOCATION,
      tide: { height_m: null, trend: "unknown", nextHighTideAt: null }, // tide provider optional
      rain: {
        last3h_mm: isFinite(rainLast3h) ? rainLast3h : null,
        next6h_mm: isFinite(rainNext6h) ? rainNext6h : null,
      },
      quality: "estimated",
      observedAt: new Date(),
    };
  } catch {
    return null;
  }
}

export async function getLatestManualEnv() {
  return EnvironmentReading.findOne({ source: "manual" })
    .sort({ observedAt: -1 })
    .lean();
}

export async function getCurrentEnvironment() {
  const apiEnv = await fetchEnvFromApi();
  if (apiEnv) return apiEnv;

  const manual = await getLatestManualEnv();
  if (manual) return manual;

  // fallback: unknown
  return {
    source: "manual",
    station: null,
    tide: { height_m: null, trend: "unknown", nextHighTideAt: null },
    rain: { last3h_mm: null, next6h_mm: null },
    quality: "unknown",
    observedAt: new Date(),
  };
}

export async function saveManualEnvironment(payload) {
  return EnvironmentReading.create({
    source: "manual",
    station: payload.station || null,
    tide: {
      height_m: payload?.tide?.height_m ?? null,
      trend: payload?.tide?.trend || "unknown",
      nextHighTideAt: payload?.tide?.nextHighTideAt
        ? new Date(payload.tide.nextHighTideAt)
        : null,
    },
    rain: {
      last3h_mm: payload?.rain?.last3h_mm ?? null,
      next6h_mm: payload?.rain?.next6h_mm ?? null,
    },
    quality: payload?.quality || "good",
    observedAt: payload?.observedAt ? new Date(payload.observedAt) : new Date(),
  });
}
