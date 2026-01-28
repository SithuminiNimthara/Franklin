import EnvironmentReading from "../models/environment.model.js";

// Keys
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY || "";
const WORLDTIDES_KEY = process.env.WORLDTIDES_KEY || "";

// Location
const ENV_LAT = Number(process.env.ENV_LAT || 0);
const ENV_LON = Number(process.env.ENV_LON || 0);
const ENV_STATION = process.env.ENV_STATION || null;

// ✅ Cache window (avoid hitting paid APIs too often)
const API_CACHE_MINUTES = Number(process.env.ENV_API_CACHE_MINUTES || 10);

function isValidLatLon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
}

/**
 * OpenWeather: 5-day / 3-hour forecast.
 * We use:
 * - last3h_mm = list[0].rain["3h"]
 * - next6h_mm = list[1] + list[2]
 */
async function fetchRainFromOpenWeather() {
  if (!OPENWEATHER_KEY) return null;
  if (!isValidLatLon(ENV_LAT, ENV_LON)) return null;

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${ENV_LAT}&lon=${ENV_LON}&appid=${OPENWEATHER_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const list = Array.isArray(data?.list) ? data.list : [];

  const last3h = Number(list?.[0]?.rain?.["3h"] ?? 0);
  const next3h = Number(list?.[1]?.rain?.["3h"] ?? 0);
  const next6h = Number(list?.[2]?.rain?.["3h"] ?? 0);

  return {
    last3h_mm: Number.isFinite(last3h) ? last3h : null,
    next6h_mm:
      Number.isFinite(next3h) && Number.isFinite(next6h)
        ? next3h + next6h
        : null,
  };
}

/**
 * WorldTides: heights array.
 * We use:
 * - height_m = heights[0].height
 * - trend from heights[1] vs heights[0]
 */
async function fetchTideFromWorldTides() {
  if (!WORLDTIDES_KEY) return null;
  if (!isValidLatLon(ENV_LAT, ENV_LON)) return null;

  const url = `https://www.worldtides.info/api/v3?lat=${ENV_LAT}&lon=${ENV_LON}&key=${WORLDTIDES_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const heights = Array.isArray(data?.heights) ? data.heights : [];

  if (heights.length < 2) {
    return { height_m: null, trend: "unknown", nextHighTideAt: null };
  }

  const h0 = Number(heights[0]?.height);
  const h1 = Number(heights[1]?.height);

  const height_m = Number.isFinite(h0) ? h0 : null;
  let trend = "unknown";
  if (Number.isFinite(h0) && Number.isFinite(h1)) {
    if (h1 > h0) trend = "rising";
    else if (h1 < h0) trend = "falling";
    else trend = "steady";
  }

  return { height_m, trend, nextHighTideAt: null };
}

/**
 * ✅ API fetch (returns null if not configured/fails)
 * (does NOT save — saving is handled in getCurrentEnvironment)
 */
export async function fetchEnvFromApi() {
  if (!OPENWEATHER_KEY && !WORLDTIDES_KEY) return null;

  try {
    const [rain, tide] = await Promise.all([
      fetchRainFromOpenWeather(),
      fetchTideFromWorldTides(),
    ]);

    if (!rain && !tide) return null;

    return {
      source: "api",
      station: ENV_STATION,
      tide: tide ?? { height_m: null, trend: "unknown", nextHighTideAt: null },
      rain: rain ?? { last3h_mm: null, next6h_mm: null },
      quality: "estimated",
      observedAt: new Date(),
    };
  } catch (e) {
    console.warn("fetchEnvFromApi failed:", e.message || e);
    return null;
  }
}

/** ✅ Get latest API env from DB (cached) */
export async function getLatestApiEnv() {
  return EnvironmentReading.findOne({ source: "api" })
    .sort({ observedAt: -1 })
    .lean();
}

/** ✅ Get latest manual env from DB */
export async function getLatestManualEnv() {
  return EnvironmentReading.findOne({ source: "manual" })
    .sort({ observedAt: -1 })
    .lean();
}

/** ✅ Save API env reading to DB */
export async function saveApiEnvironment(env) {
  return EnvironmentReading.create({
    source: "api",
    station: env.station || ENV_STATION || null,
    tide: {
      height_m: env?.tide?.height_m ?? null,
      trend: env?.tide?.trend || "unknown",
      nextHighTideAt: env?.tide?.nextHighTideAt
        ? new Date(env.tide.nextHighTideAt)
        : null,
    },
    rain: {
      last3h_mm: env?.rain?.last3h_mm ?? null,
      next6h_mm: env?.rain?.next6h_mm ?? null,
    },
    quality: env?.quality || "estimated",
    observedAt: env?.observedAt ? new Date(env.observedAt) : new Date(),
  });
}

/**
 * ✅ MAIN: Get current environment
 * 1) Use cached API reading if still fresh
 * 2) Otherwise fetch from API and store
 * 3) Else fallback to manual
 * 4) Else fallback unknown
 */
export async function getCurrentEnvironment() {
  // 1) Cached API env
  const latestApi = await getLatestApiEnv();
  if (latestApi?.observedAt) {
    const ageMs = Date.now() - new Date(latestApi.observedAt).getTime();
    const maxAgeMs = API_CACHE_MINUTES * 60 * 1000;

    if (ageMs <= maxAgeMs) {
      return latestApi; // ✅ return cached
    }
  }

  // 2) Fetch API + store
  const apiEnv = await fetchEnvFromApi();
  if (apiEnv) {
    try {
      const saved = await saveApiEnvironment(apiEnv);
      return saved.toObject ? saved.toObject() : saved;
    } catch (e) {
      // if DB insert fails, still return API env (don’t break system)
      console.warn("saveApiEnvironment failed:", e.message || e);
      return apiEnv;
    }
  }

  // 3) Manual fallback
  const manual = await getLatestManualEnv();
  if (manual) return manual;

  // 4) Unknown
  return {
    source: "manual",
    station: null,
    tide: { height_m: null, trend: "unknown", nextHighTideAt: null },
    rain: { last3h_mm: null, next6h_mm: null },
    quality: "unknown",
    observedAt: new Date(),
  };
}

/** Manual save (already good) */
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
