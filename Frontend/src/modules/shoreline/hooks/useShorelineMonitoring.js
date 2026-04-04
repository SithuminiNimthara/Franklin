import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

import {
  fetchAlerts,
  fetchBoundary,
  predictDemoVideo,
  evaluateVideo,
} from "../api/shoreline.api.js";

import {
  DEMO_VIDEO_NAME,
  DEMO_VIDEO_SRC,
  buildDemoFrameSeries,
  buildEvaluatedFrameSeries,
  buildSharedNestState,
  countHighRiskNests,
  countMediumRiskNests,
  findNearestFrame,
  getNestStatusFromDistance,
  normalizeAlertItems,
} from "../utils/shoreline.utils.js";

export function useShorelineMonitoring() {
  const [boundary, setBoundary] = useState([]);
  const [shoreline, setShoreline] = useState([]);
  const [nests, setNests] = useState(buildSharedNestState());
  const [alerts, setAlerts] = useState([]);
  const [crossedBoundary, setCrossedBoundary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [frameSeriesPct, setFrameSeriesPct] = useState([]);
  const [currentEnvironment, setCurrentEnvironment] = useState(null);

  const videoRef = useRef(null);
  const { getToken } = useAuth();

  const playVideoFromStart = useCallback(() => {
    setTimeout(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      videoElement.currentTime = 0;
      videoElement.play().catch(() => {});
    }, 150);
  }, []);

  const applyEvaluationToNests = useCallback((evaluation) => {
    const riskMap = new Map(
      (evaluation?.nestsEvaluated || []).map((nest) => [
        nest.id,
        nest.distancePct,
      ]),
    );

    setNests((previousNests) =>
      previousNests.map((nest) => {
        const distancePct = riskMap.get(nest.id);

        return {
          ...nest,
          distanceToShoreline: distancePct ?? null,
          status: getNestStatusFromDistance(distancePct),
        };
      }),
    );
  }, []);

  const refreshStaticData = useCallback(async () => {
    try {
      const [boundaryData, alertsData] = await Promise.all([
        fetchBoundary(),
        fetchAlerts(),
      ]);

      setBoundary(boundaryData?.points || []);
      setNests(buildSharedNestState());
      setAlerts(normalizeAlertItems(alertsData));
    } catch (error) {
      console.error("Static load failed:", error);
    }
  }, []);

  const loadDemoVideo = useCallback(async () => {
    try {
      setLoading(true);
      setVideoUrl(DEMO_VIDEO_SRC);

      const demoData = await predictDemoVideo(DEMO_VIDEO_NAME);
      const series = buildDemoFrameSeries(demoData);

      setFrameSeriesPct(series);

      if (series[0]?.shorelinePct) {
        setShoreline(series[0].shorelinePct);
      }

      setLastUpdated(new Date().toLocaleTimeString());
      playVideoFromStart();
    } catch (error) {
      console.error("Demo load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [playVideoFromStart]);

  const runVideoEvaluation = useCallback(
    async (file) => {
      setLoading(true);

      try {
        const token = await getToken();
        const objectUrl = URL.createObjectURL(file);

        setVideoUrl(objectUrl);
        setFrameSeriesPct([]);
        setCrossedBoundary(false);
        setNests(buildSharedNestState());

        const videoData = await evaluateVideo(file, 3, token);
        const series = buildEvaluatedFrameSeries(videoData);

        setFrameSeriesPct(series);

        if (series[0]?.shorelinePct) {
          setShoreline(series[0].shorelinePct);
        }

        const firstEvaluation = series[0]?.evaluation;
        setCrossedBoundary(Boolean(firstEvaluation?.boundaryCrossed));
        applyEvaluationToNests(firstEvaluation);

        setLastUpdated(new Date().toLocaleTimeString());

        const freshAlerts = await fetchAlerts();
        setAlerts(normalizeAlertItems(freshAlerts));

        playVideoFromStart();
      } catch (error) {
        console.error("Video evaluation failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [applyEvaluationToNests, getToken, playVideoFromStart],
  );

  useEffect(() => {
    refreshStaticData();
  }, [refreshStaticData]);

  useEffect(() => {
    loadDemoVideo();
  }, [loadDemoVideo]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const currentFrame = findNearestFrame(
        videoElement.currentTime,
        frameSeriesPct,
      );
      if (!currentFrame) return;

      setShoreline(currentFrame.shorelinePct || []);

      if (currentFrame.evaluation) {
        setCrossedBoundary(Boolean(currentFrame.evaluation.boundaryCrossed));
        applyEvaluationToNests(currentFrame.evaluation);
      }
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("play", handleTimeUpdate);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("play", handleTimeUpdate);
    };
  }, [applyEvaluationToNests, frameSeriesPct]);

  const highRiskCount = countHighRiskNests(nests, crossedBoundary);
  const warningCount = countMediumRiskNests(nests);

  return {
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
  };
}
