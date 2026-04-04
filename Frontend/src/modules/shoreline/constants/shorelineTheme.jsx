import React from "react";

export const SHORELINE_COLORS = {
  pageBackground: "#f4f7fb",
  panelBackground: "#ffffff",
  cardBackground: "#ffffff",
  softWhite: "rgba(255,255,255,0.82)",

  border: "#dbe7f3",
  title: "#0f172a",
  text: "#334155",
  muted: "#64748b",

  primary: "#2563eb",
  cyan: "#06b6d4",

  success: "#16a34a",
  successSoft: "#dcfce7",

  warning: "#f59e0b",
  warningSoft: "#fef3c7",

  danger: "#ef4444",
  dangerSoft: "#fee2e2",

  info: "#0ea5e9",
  infoSoft: "#e0f2fe",

  violet: "#8b5cf6",
  violetSoft: "#f5f3ff",

  shadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

export function addAlphaToHex(hexColor, alpha = "15") {
  if (!hexColor || typeof hexColor !== "string") return hexColor;

  if (hexColor.startsWith("#") && hexColor.length === 7) {
    return `${hexColor}${alpha}`;
  }

  return hexColor;
}

export function SectionHeader({
  icon: Icon,
  title,
  accent = SHORELINE_COLORS.primary,
  rightContent = null,
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: addAlphaToHex(accent, "15"),
            color: accent,
          }}
        >
          <Icon size={18} />
        </div>

        <div>
          <h3
            className="text-[16px] font-bold leading-none"
            style={{ color: SHORELINE_COLORS.title }}
          >
            {title}
          </h3>
        </div>
      </div>

      {rightContent}
    </div>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}
      style={{
        borderColor: SHORELINE_COLORS.border,
        backgroundColor: SHORELINE_COLORS.panelBackground,
        boxShadow: SHORELINE_COLORS.shadow,
      }}
    >
      {children}
    </div>
  );
}

export function LiveDot({ color = SHORELINE_COLORS.success }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
