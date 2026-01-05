import React from "react";

/**
 * boundary: [{x:0..100,y:0..100},...]
 * shoreline: [{x:0..100,y:0..100},...]
 * nests: [{id,x,y,zone,status,distanceToShoreline?},...]
 */

function nestColor(status) {
  if (status === "danger") return "bg-red-500 border-red-700 shadow-red-500/50";
  if (status === "warning")
    return "bg-amber-500 border-amber-700 shadow-amber-500/50";
  return "bg-emerald-500 border-emerald-700 shadow-emerald-500/50";
}

export default function ShorelineBeachMap({
  boundary = [],
  shoreline = [],
  nests = [],
}) {
  const riskLevel = nests.some((n) => n.status === "danger") ? "high" : "low";

  const boundaryPoints = boundary.length
    ? boundary.map((p) => `${p.x},${p.y}`).join(" ")
    : "";

  const shorelinePoints = shoreline.length
    ? shoreline.map((p) => `${p.x},${p.y}`).join(" ")
    : "";

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-yellow-100 via-amber-50 to-blue-200 rounded-2xl overflow-hidden shadow-inner">
      {/* grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <pattern
              id="grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-gray-500"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* water tint */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-400/40 to-transparent pointer-events-none" />

      {/* SVG overlay */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* boundary dashed */}
        {boundary.length ? (
          <polyline
            points={boundaryPoints}
            fill="none"
            stroke="rgb(239,68,68)"
            strokeWidth="1.2"
            strokeDasharray="3 2"
            opacity="0.95"
          />
        ) : null}

        {/* shoreline solid */}
        {shoreline.length ? (
          <polyline
            points={shorelinePoints}
            fill="none"
            stroke={riskLevel === "high" ? "rgb(239,68,68)" : "rgb(37,99,235)"}
            strokeWidth="1.4"
            opacity="0.95"
          />
        ) : null}
      </svg>

      {/* nests */}
      {nests.map((nest) => (
        <div
          key={nest.id}
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${nest.x}%`, top: `${nest.y}%` }}
          title={`${nest.zone || ""} • ${(
            nest.status || "safe"
          ).toUpperCase()}${
            nest.distanceToShoreline != null
              ? ` • d=${Number(nest.distanceToShoreline).toFixed(2)}%`
              : ""
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full border-2 shadow-lg ${nestColor(
              nest.status || "safe"
            )}`}
          />
        </div>
      ))}

      {/* legend */}
      <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
        <p className="text-xs font-bold text-gray-800 mb-2">Legend</p>
        <div className="space-y-1 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-[2px] bg-red-500" />
            <span>Boundary (dashed)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-[2px] bg-blue-600" />
            <span>Shoreline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700" />
            <span>Safe nest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border border-amber-700" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 border border-red-700" />
            <span>Danger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
