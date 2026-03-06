import { yAtX } from "../utils/geo.util.js";

// ✅ vertical distance (better for shoreline run-up risk)
function verticalDistancePct(nest, shorelinePts) {
  const sy = yAtX(shorelinePts, nest.x);
  if (sy == null) return Infinity;
  return Math.abs(nest.y - sy);
}

export function evaluateRisk({ shorelinePct, boundary, nests, bufferPct }) {
  const boundaryPts = boundary.points;
  let boundaryCrossed = false;

  // ✅ boundary crossing
  for (const s of shorelinePct) {
    const by = yAtX(boundaryPts, s.x);
    if (by != null && s.y < by - boundary.marginPct) boundaryCrossed = true;
  }

  // ✅ evaluate ALL nests using vertical shoreline distance
  const nestsEvaluated = (nests || []).map((n) => {
    const d = verticalDistancePct(n, shorelinePct);
    return { ...n, distancePct: d };
  });

  const nestsAtRisk = nestsEvaluated.filter((n) => n.distancePct <= bufferPct);

  return {
    riskLevel: boundaryCrossed || nestsAtRisk.length ? "high" : "low",
    boundaryCrossed,
    nestsAtRisk,
    nestsAtRiskCount: nestsAtRisk.length,
    nestsEvaluated,
  };
}
