export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function distPct(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function yAtX(boundaryPts, xPct) {
  if (!boundaryPts || boundaryPts.length < 2) return null;

  if (xPct <= boundaryPts[0].x) return boundaryPts[0].y;
  if (xPct >= boundaryPts.at(-1).x) return boundaryPts.at(-1).y;

  for (let i = 0; i < boundaryPts.length - 1; i++) {
    const a = boundaryPts[i];
    const b = boundaryPts[i + 1];
    if (xPct >= a.x && xPct <= b.x) {
      const t = (xPct - a.x) / (b.x - a.x || 1e-9);
      return a.y + t * (b.y - a.y);
    }
  }
  return null;
}
