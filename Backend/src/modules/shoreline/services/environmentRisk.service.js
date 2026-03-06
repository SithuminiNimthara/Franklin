export function environmentScore(env) {
  let score = 0;

  // Rain (0-10)
  const r3 = Number(env?.rain?.last3h_mm ?? 0);
  const r6 = Number(env?.rain?.next6h_mm ?? 0);

  if (r3 >= 20 || r6 >= 20) score += 10;
  else if (r3 >= 5 || r6 >= 5) score += 4;

  // Tide (0-20) (only if you have tide data)
  const tideH = env?.tide?.height_m;
  const trend = env?.tide?.trend;

  if (typeof tideH === "number") {
    if (tideH >= 1.5)
      score += 15; // choose thresholds per beach calibration
    else if (tideH >= 1.0) score += 8;
  }

  if (trend === "rising") score += 5;

  return score; // 0..30
}
