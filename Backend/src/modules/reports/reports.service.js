import { Detection } from "../detections/detections.model.js";
import { TurtleHealth } from "../turtleHealth/health.model.js";
import Alert from "../shoreline/models/alert.model.js";
import { HatcheryVideo, HatcheryAlert } from "../hatchery/hatchery.models.js";
import { Report } from "./report.model.js";
import { analyticsService } from "../analytics/analytics.service.js";

const buildDateFilter = (from, to, field = "timestamp") => {
  if (!from || !to) return {};
  return { [field]: { $gte: new Date(from), $lte: new Date(to) } };
};

const generateMonthlyConservationSummary = async (from, to) => {
  const timestampFilter = buildDateFilter(from, to, "timestamp");
  const createdAtFilter = buildDateFilter(from, to, "createdAt");
  const uploadDateFilter = buildDateFilter(from, to, "uploadDate");

  const [
    healthStats,
    detectionStats,
    alertStats,
    hatcheryStats,
    healthBreakdown,
    detectionBreakdown,
    alertBreakdown
  ] = await Promise.all([
    // TurtleHealth summary
    TurtleHealth.aggregate([
      { $match: timestampFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } },
          fp: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "fp"] }, 1, 0] } },
          barnacles: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "barnacles"] }, 1, 0] } },
          avgConfidence: { $avg: "$confidence" }
        }
      }
    ]),
    // Detection summary
    Detection.aggregate([
      { $match: timestampFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          turtles: { $sum: { $cond: [{ $eq: ["$type", "turtle"] }, 1, 0] } },
          predators: { $sum: { $cond: [{ $eq: ["$type", "predator"] }, 1, 0] } },
          humans: { $sum: { $cond: [{ $eq: ["$type", "human"] }, 1, 0] } },
          nests: { $sum: { $cond: [{ $eq: ["$type", "nest"] }, 1, 0] } },
          safeNests: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "nest"] }, { $eq: ["$nestStatus", "safe"] }] }, 1, 0] } }
        }
      }
    ]),
    // Alert summary
    Alert.aggregate([
      { $match: createdAtFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ["$riskLevel", "medium"] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ["$riskLevel", "low"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] } },
          newAlerts: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } }
        }
      }
    ]),
    // Hatchery summary
    HatcheryVideo.aggregate([
      { $match: uploadDateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          avgConfidence: { $avg: "$analysis.confidence" }
        }
      }
    ]),
    // Health monthly breakdown
    TurtleHealth.aggregate([
      { $match: timestampFilter },
      {
        $group: {
          _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
          total: { $sum: 1 },
          healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    // Detection monthly breakdown
    Detection.aggregate([
      { $match: timestampFilter },
      {
        $group: {
          _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
          total: { $sum: 1 },
          nests: { $sum: { $cond: [{ $eq: ["$type", "nest"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    // Alert monthly breakdown
    Alert.aggregate([
      { $match: createdAtFilter },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    title: "Monthly Conservation Summary",
    period: { from, to },
    health: healthStats[0] || { total: 0, healthy: 0, fp: 0, barnacles: 0, avgConfidence: 0 },
    detections: detectionStats[0] || { total: 0, turtles: 0, predators: 0, humans: 0, nests: 0, safeNests: 0 },
    alerts: alertStats[0] || { total: 0, high: 0, medium: 0, low: 0, resolved: 0, acknowledged: 0, newAlerts: 0 },
    hatchery: hatcheryStats[0] || { total: 0, completed: 0, processing: 0, errors: 0, avgConfidence: 0 },
    monthlyBreakdown: {
      health: healthBreakdown.map(r => ({ month: months[r._id.month - 1], year: r._id.year, ...r })),
      detections: detectionBreakdown.map(r => ({ month: months[r._id.month - 1], year: r._id.year, ...r })),
      alerts: alertBreakdown.map(r => ({ month: months[r._id.month - 1], year: r._id.year, ...r }))
    }
  };
};

const generateTurtleHealthAnalytics = async (from, to) => {
  const filter = buildDateFilter(from, to, "timestamp");

  const [summary, byDiagnosis, confidenceStats, monthlyTrend, recentRecords] = await Promise.all([
    TurtleHealth.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } },
          fp: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "fp"] }, 1, 0] } },
          barnacles: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "barnacles"] }, 1, 0] } },
          avgConfidence: { $avg: "$confidence" },
          minConfidence: { $min: "$confidence" },
          maxConfidence: { $max: "$confidence" }
        }
      }
    ]),
    TurtleHealth.aggregate([
      { $match: filter },
      { $group: { _id: "$diagnosisClass", count: { $sum: 1 }, avgConfidence: { $avg: "$confidence" } } }
    ]),
    TurtleHealth.aggregate([
      { $match: filter },
      {
        $bucket: {
          groupBy: "$confidence",
          boundaries: [0, 0.25, 0.5, 0.75, 1.01],
          default: "other",
          output: { count: { $sum: 1 } }
        }
      }
    ]),
    TurtleHealth.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
          total: { $sum: 1 },
          healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } },
          unhealthy: { $sum: { $cond: [{ $ne: ["$diagnosisClass", "healthy"] }, 1, 0] } },
          avgConfidence: { $avg: "$confidence" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    TurtleHealth.find(filter).sort({ timestamp: -1 }).limit(20).lean()
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    title: "Turtle Health Analytics",
    period: { from, to },
    summary: summary[0] || { total: 0, healthy: 0, fp: 0, barnacles: 0, avgConfidence: 0 },
    diagnosisBreakdown: byDiagnosis,
    confidenceDistribution: confidenceStats,
    monthlyTrend: monthlyTrend.map(r => ({
      month: months[r._id.month - 1],
      year: r._id.year,
      total: r.total,
      healthy: r.healthy,
      unhealthy: r.unhealthy,
      avgConfidence: parseFloat((r.avgConfidence || 0).toFixed(3))
    })),
    recentRecords
  };
};

const generateNestProtectionReport = async (from, to) => {
  const filter = buildDateFilter(from, to, "timestamp");

  const [summary, byType, byZone, nestStatusBreakdown, monthlyTrend, recentDetections] = await Promise.all([
    Detection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          turtles: { $sum: { $cond: [{ $eq: ["$type", "turtle"] }, 1, 0] } },
          predators: { $sum: { $cond: [{ $eq: ["$type", "predator"] }, 1, 0] } },
          humans: { $sum: { $cond: [{ $eq: ["$type", "human"] }, 1, 0] } },
          nests: { $sum: { $cond: [{ $eq: ["$type", "nest"] }, 1, 0] } },
          avgConfidence: { $avg: "$confidence" }
        }
      }
    ]),
    Detection.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 }, avgConfidence: { $avg: "$confidence" } } }
    ]),
    Detection.aggregate([
      { $match: filter },
      { $group: { _id: "$location.zone", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Detection.aggregate([
      { $match: { ...filter, type: "nest" } },
      { $group: { _id: "$nestStatus", count: { $sum: 1 } } }
    ]),
    Detection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
          total: { $sum: 1 },
          nests: { $sum: { $cond: [{ $eq: ["$type", "nest"] }, 1, 0] } },
          threats: { $sum: { $cond: [{ $in: ["$type", ["predator", "human"]] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    Detection.find(filter).sort({ timestamp: -1 }).limit(20).lean()
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    title: "Nest Protection Report",
    period: { from, to },
    summary: summary[0] || { total: 0, turtles: 0, predators: 0, humans: 0, nests: 0, avgConfidence: 0 },
    typeBreakdown: byType,
    zoneBreakdown: byZone,
    nestStatusBreakdown,
    monthlyTrend: monthlyTrend.map(r => ({
      month: months[r._id.month - 1],
      year: r._id.year,
      total: r.total,
      nests: r.nests,
      threats: r.threats
    })),
    recentDetections
  };
};

const generateShorelineRiskAssessment = async (from, to) => {
  const filter = buildDateFilter(from, to, "createdAt");

  const [summary, byRiskLevel, byStatus, bySource, monthlyTrend, recentAlerts] = await Promise.all([
    Alert.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ["$riskLevel", "medium"] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ["$riskLevel", "low"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] } },
          newAlerts: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } }
        }
      }
    ]),
    Alert.aggregate([
      { $match: filter },
      { $group: { _id: "$riskLevel", count: { $sum: 1 } } }
    ]),
    Alert.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Alert.aggregate([
      { $match: filter },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Alert.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    Alert.find(filter).sort({ createdAt: -1 }).limit(20).lean()
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    title: "Shoreline Risk Assessment",
    period: { from, to },
    summary: summary[0] || { total: 0, high: 0, medium: 0, low: 0, resolved: 0, acknowledged: 0, newAlerts: 0 },
    riskLevelBreakdown: byRiskLevel,
    statusBreakdown: byStatus,
    sourceBreakdown: bySource,
    monthlyTrend: monthlyTrend.map(r => ({
      month: months[r._id.month - 1],
      year: r._id.year,
      total: r.total,
      high: r.high,
      resolved: r.resolved
    })),
    recentAlerts
  };
};

const generateHatcheryManagement = async (from, to) => {
  const uploadFilter = buildDateFilter(from, to, "uploadDate");
  const createdFilter = buildDateFilter(from, to, "createdAt");

  const [videoSummary, videoByStatus, videoBySpecies, alertSummary, alertByType, alertByTank, monthlyVideos, monthlyAlerts, recentVideos, recentAlerts] = await Promise.all([
    HatcheryVideo.aggregate([
      { $match: uploadFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
          uploaded: { $sum: { $cond: [{ $eq: ["$status", "uploaded"] }, 1, 0] } },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          avgConfidence: { $avg: "$analysis.confidence" }
        }
      }
    ]),
    HatcheryVideo.aggregate([
      { $match: uploadFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    HatcheryVideo.aggregate([
      { $match: uploadFilter },
      { $group: { _id: "$analysis.species", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    HatcheryAlert.aggregate([
      { $match: createdFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
        }
      }
    ]),
    HatcheryAlert.aggregate([
      { $match: createdFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    HatcheryAlert.aggregate([
      { $match: createdFilter },
      { $group: { _id: "$tank", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    HatcheryVideo.aggregate([
      { $match: uploadFilter },
      {
        $group: {
          _id: { month: { $month: "$uploadDate" }, year: { $year: "$uploadDate" } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    HatcheryAlert.aggregate([
      { $match: createdFilter },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    HatcheryVideo.find(uploadFilter).sort({ uploadDate: -1 }).limit(15).lean(),
    HatcheryAlert.find(createdFilter).sort({ createdAt: -1 }).limit(15).lean()
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    title: "Hatchery Management Report",
    period: { from, to },
    videos: {
      summary: videoSummary[0] || { total: 0, completed: 0, processing: 0, uploaded: 0, errors: 0, avgConfidence: 0 },
      byStatus: videoByStatus,
      bySpecies: videoBySpecies,
      monthlyTrend: monthlyVideos.map(r => ({ month: months[r._id.month - 1], year: r._id.year, total: r.total, completed: r.completed }))
    },
    alerts: {
      summary: alertSummary[0] || { total: 0, pending: 0, acknowledged: 0, resolved: 0 },
      byType: alertByType,
      byTank: alertByTank,
      monthlyTrend: monthlyAlerts.map(r => ({ month: months[r._id.month - 1], year: r._id.year, total: r.total, pending: r.pending }))
    },
    recentVideos,
    recentAlerts
  };
};

const generators = {
  "monthly-conservation-summary": generateMonthlyConservationSummary,
  "turtle-health-analytics": generateTurtleHealthAnalytics,
  "nest-protection-report": generateNestProtectionReport,
  "shoreline-risk-assessment": generateShorelineRiskAssessment,
  "hatchery-management": generateHatcheryManagement
};

const reportTitles = {
  "monthly-conservation-summary": "Monthly Conservation Summary",
  "turtle-health-analytics": "Turtle Health Analytics",
  "nest-protection-report": "Nest Protection Report",
  "shoreline-risk-assessment": "Shoreline Risk Assessment",
  "hatchery-management": "Hatchery Management Report"
};

export const reportsService = {
  generateReport: async (type, from, to) => {
    const generator = generators[type];
    if (!generator) throw new Error(`Unknown report type: ${type}`);

    const snapshot = await generator(from, to);

    const report = await Report.create({
      type,
      title: reportTitles[type],
      filters: { from: from ? new Date(from) : null, to: to ? new Date(to) : null },
      generatedAt: new Date(),
      snapshot
    });

    // Clear analytics cache after generating a report
    analyticsService.clearCache();

    return report;
  },

  getAllReports: async () => {
    return Report.find().sort({ generatedAt: -1 }).lean();
  },

  getReportById: async (id) => {
    return Report.findById(id).lean();
  },

  deleteReport: async (id) => {
    return Report.findByIdAndDelete(id);
  }
};
