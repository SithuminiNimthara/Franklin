export const sortByX = (pts) => pts.slice().sort((a, b) => a.x - b.x);

export const trimEdges = (pts, n = 6) =>
  pts.length > n * 2 ? pts.slice(n, pts.length - n) : pts;

export const downsample = (pts, step = 3) =>
  pts.filter((_, i) => i % step === 0);

export function smoothY(points, win = 7) {
  const half = Math.floor(win / 2);
  return points.map((p, i) => {
    let sum = 0,
      count = 0;
    for (let k = i - half; k <= i + half; k++) {
      if (points[k]) {
        sum += points[k].y;
        count++;
      }
    }
    return { ...p, y: sum / count };
  });
}
