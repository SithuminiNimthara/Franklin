import React from "react";
import { Activity, MapPin, Upload, Video, Zap } from "lucide-react";

import ShorelineBeachMap from "../../../shared/components/maps/ShorelineBeachMap.jsx";
import EnvironmentManualForm from "../components/EnvironmentManualForm.jsx";
import ShorelineAlertsPanel from "../components/ShorelineAlertsPanel.jsx";
import ShorelineEnvironmentBanner from "../components/ShorelineEnvironmentBanner.jsx";
import ShorelineStats from "../components/ShorelineStats.jsx";
import ShorelineVideoPlayer from "../components/ShorelineVideoPlayer.jsx";
import {
  LiveDot,
  Panel,
  SectionHeader,
  SHORELINE_COLORS,
} from "../constants/shorelineTheme.jsx";
import { useShorelineMonitoring } from "../hooks/useShorelineMonitoring.js";

export default function ShorelineRiskPage() {
  const {
    boundary,
    shoreline,
    nests,
    alerts,
    crossedBoundary,
    loading,
    lastUpdated,
    videoUrl,
    frameSeriesPct,
    currentEnvironment,
    videoRef,
    highRiskCount,
    warningCount,
    setShoreline,
    setCurrentEnvironment,
    runVideoEvaluation,
  } = useShorelineMonitoring();

  return (
    <div
      className="min-h-screen space-y-6 bg-[#f4f7fb] p-4 md:p-6 lg:p-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <LiveDot color={SHORELINE_COLORS.success} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Live Monitoring · {lastUpdated || "—"}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Shoreline Risk Monitoring
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Dynamic shoreline tracking, boundary breach detection, and nest risk
            evaluation
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-5 py-3 font-semibold text-white shadow-md transition hover:shadow-lg lg:self-auto">
          {loading ? (
            <Activity size={16} className="animate-pulse" />
          ) : (
            <Upload size={16} />
          )}

          {loading ? "Analyzing..." : "Analyze Video"}

          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];

              if (selectedFile) {
                runVideoEvaluation(selectedFile);
              }

              event.target.value = "";
            }}
          />
        </label>
      </div>

      <ShorelineStats
        highRiskCount={highRiskCount}
        warningCount={warningCount}
        monitoredCount={nests.length}
        crossedBoundary={crossedBoundary}
      />

      <ShorelineEnvironmentBanner environment={currentEnvironment} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Panel>
            <SectionHeader
              icon={MapPin}
              title="Risk Topography"
              accent={SHORELINE_COLORS.primary}
            />

            <ShorelineBeachMap
              boundary={boundary}
              shoreline={shoreline}
              nests={nests}
              crossedBoundary={crossedBoundary}
            />
          </Panel>

          <Panel>
            <SectionHeader
              icon={Video}
              title="Live Tracking"
              accent={SHORELINE_COLORS.violet}
            />

            {videoUrl ? (
              <div className="space-y-4">
                <ShorelineVideoPlayer
                  videoRef={videoRef}
                  src={videoUrl}
                  frameSeriesPct={frameSeriesPct}
                  onTimeShoreline={setShoreline}
                />

                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3">
                  <div className="mt-0.5 text-violet-600">
                    <Zap size={15} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-violet-700">
                      AI Tracking Process
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                      Shoreline movement is evaluated against the safety
                      boundary, and nests are highlighted when they move into
                      warning or critical range.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#dbe7f3] bg-[#f8fbff]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Video size={28} />
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  Upload footage to begin shoreline analysis
                </p>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <ShorelineAlertsPanel staffName="Ranger-01" initialItems={alerts} />

          <EnvironmentManualForm onSaved={setCurrentEnvironment} />
        </div>
      </div>
    </div>
  );
}
