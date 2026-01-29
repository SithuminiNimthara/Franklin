import { distPct, yAtX } from "../utils/geo.util.js";

export function evaluateRisk({ shorelinePct, boundary, nests, bufferPct }) {
  const boundaryPts = boundary.points;
  let boundaryCrossed = false;

  for (const s of shorelinePct) {
    const by = yAtX(boundaryPts, s.x);
    if (by != null && s.y < by - boundary.marginPct) boundaryCrossed = true;
  }

  const nestsAtRisk = nests
    .map((n) => {
      const d = Math.min(...shorelinePct.map((s) => distPct(n, s)));
      return { ...n, distancePct: d };
    })
    .filter((n) => n.distancePct <= bufferPct);

  return {
    riskLevel: boundaryCrossed || nestsAtRisk.length ? "high" : "low",
    boundaryCrossed,
    nestsAtRisk,
  };
}
