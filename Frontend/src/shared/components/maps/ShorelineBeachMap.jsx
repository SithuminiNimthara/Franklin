import React, { useMemo, useState } from "react";
import {
  MapPin,
  Users,
  Dog,
  Turtle as TurtleIcon,
  AlertTriangle,
  ShieldAlert,
  Waves,
} from "lucide-react";

function nestColor(status) {
  if (status === "danger") {
    return "bg-red-500 border-red-700 shadow-red-500/50";
  }
  if (status === "warning") {
    return "bg-amber-500 border-amber-700 shadow-amber-500/50";
  }
  return "bg-emerald-500 border-emerald-700 shadow-emerald-500/50";
}

function getEntityIcon(type) {
  switch (type) {
    case "human":
      return Users;
    case "predator":
      return Dog;
    case "turtle":
      return TurtleIcon;
    case "nest":
    default:
      return MapPin;
  }
}

function getEntityColor(entity) {
  if (entity.type === "nest") {
    return nestColor(entity.status || "safe");
  }
  if (entity.type === "human") {
    return "bg-blue-500 border-blue-700 shadow-blue-500/50";
  }
  if (entity.type === "predator") {
    return "bg-red-600 border-red-800 shadow-red-600/50";
  }
  if (entity.type === "turtle") {
    return "bg-teal-500 border-teal-700 shadow-teal-500/50";
  }
  return "bg-slate-500 border-slate-700 shadow-slate-500/50";
}

function riskBadgeClasses(level) {
  if (level === "high") return "bg-red-600 text-white border-red-400";
  if (level === "medium") return "bg-amber-500 text-white border-amber-300";
  return "bg-emerald-600 text-white border-emerald-300";
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function nearestShorelinePoint(nest, shoreline) {
  if (!shoreline?.length) return null;

  let best = null;
  let bestDist = Infinity;

  for (const p of shoreline) {
    const dx = p.x - nest.x;
    const dy = p.y - nest.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best ? { ...best, distance: bestDist } : null;
}

/**
 * Convert raw predicted shoreline to a clean beach-map shoreline.
 * Keeps movement from prediction, but constrains it to the sea/top zone.
 */
function normalizePredictedShoreline(
  rawShoreline = [],
  crossedBoundary = false,
) {
  if (!Array.isArray(rawShoreline) || rawShoreline.length < 2) {
    const fallbackY = crossedBoundary ? 36 : 28;
    return [
      { x: 2, y: fallbackY + 1 },
      { x: 10, y: fallbackY + 2 },
      { x: 22, y: fallbackY + 2 },
      { x: 35, y: fallbackY + 2 },
      { x: 48, y: fallbackY + 4 },
      { x: 62, y: fallbackY + 2.5 },
      { x: 78, y: fallbackY + 2 },
      { x: 98, y: fallbackY + 1.5 },
    ];
  }

  const sorted = [...rawShoreline]
    .map((p) => ({
      x: Number(p.x),
      y: Number(p.y),
    }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x);

  if (sorted.length < 2) {
    const fallbackY = crossedBoundary ? 36 : 28;
    return [
      { x: 2, y: fallbackY + 1 },
      { x: 98, y: fallbackY + 1.5 },
    ];
  }

  const minY = Math.min(...sorted.map((p) => p.y));
  const maxY = Math.max(...sorted.map((p) => p.y));
  const rangeY = Math.max(maxY - minY, 1);

  // display zone
  const targetTop = crossedBoundary ? 31 : 20;
  const targetBottom = crossedBoundary ? 40 : 29;

  return sorted.map((p) => {
    const normalizedY = (p.y - minY) / rangeY;
    return {
      x: clamp(p.x, 2, 98),
      y: clamp(targetTop + normalizedY * (targetBottom - targetTop), 16, 42),
    };
  });
}

export default function ShorelineBeachMap({
  boundary = [],
  shoreline = [],
  nests = [],
  crossedBoundary = false,
  extraEntities = [],
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const nestDanger = nests.some((n) => n.status === "danger");
  const nestWarning = nests.some((n) => n.status === "warning");

  const riskLevel =
    crossedBoundary || nestDanger ? "high" : nestWarning ? "medium" : "low";

  // keep boundary straight for beach map
  const displayBoundary = useMemo(() => {
    return [
      { x: 5, y: 38 },
      { x: 95, y: 38 },
    ];
  }, []);

  // THIS is the important part:
  // use predicted shoreline prop, but map it into the clean sea area
  const displayShoreline = useMemo(() => {
    return normalizePredictedShoreline(shoreline, crossedBoundary);
  }, [shoreline, crossedBoundary]);

  const boundaryPoints = displayBoundary.map((p) => `${p.x},${p.y}`).join(" ");
  const shorelinePoints = displayShoreline
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const seaPolygonPoints = `0,0 100,0 100,${
    displayShoreline[displayShoreline.length - 1].y
  } ${displayShoreline
    .slice()
    .reverse()
    .map((p) => `${p.x},${p.y}`)
    .join(" ")} 0,${displayShoreline[0].y}`;

  const mergedEntities = useMemo(() => {
    const nestEntities = nests.map((n) => ({
      ...n,
      type: "nest",
      label: n.zone || n.label || n.id,
    }));

    return [...nestEntities, ...(extraEntities || [])];
  }, [nests, extraEntities]);

  const nestConnections = useMemo(() => {
    return nests
      .map((nest) => {
        const near = nearestShorelinePoint(nest, displayShoreline);
        if (!near) return null;

        return {
          id: nest.id,
          from: { x: nest.x, y: nest.y },
          to: { x: near.x, y: near.y },
          distance: near.distance,
          status: nest.status || "safe",
        };
      })
      .filter(Boolean);
  }, [nests, displayShoreline]);

  const highRiskActive =
    crossedBoundary ||
    mergedEntities.some((e) => e.type === "predator") ||
    nestDanger;

  const shorelineColor =
    riskLevel === "high"
      ? "#ef4444"
      : riskLevel === "medium"
        ? "#f59e0b"
        : "#2563eb";

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-[#dbe7f3] shadow-inner">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f7edd2] via-[#efe0b2] to-[#e7d39b]" />

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="h-full w-full">
          <pattern
            id="gridUnified"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-400"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#gridUnified)" />
        </svg>
      </div>

      <svg
        className="absolute inset-0 z-10 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="seaFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#cbefff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#dff6ff" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <polygon points={seaPolygonPoints} fill="url(#seaFill)" />

        <polyline
          points={shorelinePoints}
          fill="none"
          stroke={shorelineColor}
          strokeWidth="1.35"
          opacity="1"
        />
        <polyline
          points={shorelinePoints}
          fill="none"
          stroke={`${shorelineColor}55`}
          strokeWidth="3"
          opacity="0.45"
        />

        <polyline
          points={boundaryPoints}
          fill="none"
          stroke="rgb(239,68,68)"
          strokeWidth="0.9"
          strokeDasharray="2 1"
          opacity="0.9"
        />

        {nestConnections
          .filter((line) => line.status !== "safe")
          .map((line) => (
            <line
              key={line.id}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={line.status === "danger" ? "#ef4444" : "#f59e0b"}
              strokeWidth="0.4"
              strokeDasharray="1 1"
              opacity="0.9"
            />
          ))}
      </svg>

      <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-cyan-500" />
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-800">
          Open Ocean
        </span>
        <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-cyan-500" />
      </div>

      {highRiskActive && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-red-500/5" />
      )}

      <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-lg ${riskBadgeClasses(
            riskLevel,
          )}`}
        >
          {riskLevel === "high" ? (
            <ShieldAlert size={13} />
          ) : (
            <Waves size={13} />
          )}
          {riskLevel} risk
        </div>

        {highRiskActive && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-3 py-2 text-white shadow-xl">
            <AlertTriangle size={14} className="animate-pulse" />
            <div>
              <p className="text-[10px] font-black uppercase">
                Critical Monitoring
              </p>
              <p className="text-[10px] opacity-90">
                {crossedBoundary
                  ? "Boundary breach detected"
                  : "Nest threat detected near shoreline"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* moved to bottom-left */}
      <div className="absolute bottom-16 left-4 z-30 rounded-xl border border-white/20 bg-white/90 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-2 border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Topography Key
        </p>

        <div className="space-y-1.5 text-[10px] font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="h-[1px] w-4 border-t border-dashed bg-red-500" />
            <span>Hazard Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-[1.5px] w-4 bg-blue-600" />
            <span>Tide Shoreline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-[1px] w-4 bg-slate-400" />
            <span>Nest Distance Link</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Safe Nest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Warning Nest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span>Critical Nest</span>
          </div>
        </div>
      </div>

      {mergedEntities.map((entity) => {
        const Icon = getEntityIcon(entity.type);

        return (
          <div
            key={entity.id}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
            style={{
              left: `${clamp(entity.x, 3, 97)}%`,
              top: `${clamp(entity.y, 8, 92)}%`,
            }}
            onMouseEnter={() => setHoveredId(entity.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={`rounded-full border-2 border-white p-2 shadow-xl transition-transform hover:scale-110 ${getEntityColor(
                entity,
              )}`}
            >
              <Icon className="h-3 w-3 text-white" />
            </div>

            {hoveredId === entity.id && (
              <div className="absolute bottom-full left-1/2 z-40 mb-3 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-2xl">
                {entity.label}
                {entity.type === "nest" &&
                  entity.distanceToShoreline != null && (
                    <div className="mt-1 text-[8px] font-semibold normal-case tracking-normal text-slate-200">
                      Distance: {Number(entity.distanceToShoreline).toFixed(2)}%
                    </div>
                  )}
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-white/60 px-4 py-1.5 backdrop-blur-sm">
        <p className="flex items-center text-[9px] font-black uppercase tracking-tight text-slate-500">
          Coastal telemetry active
          <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        </p>
      </div>
    </div>
  );
}
