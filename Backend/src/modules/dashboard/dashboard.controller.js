import { Detection } from '../detections/detections.model.js';
import { TurtleHealth } from '../turtleHealth/health.model.js';
import { HatcheryVideo, HatcheryAlert } from '../hatchery/hatchery.models.js';
import Alert from '../shoreline/models/alert.model.js';
import { readJson } from '../shoreline/utils/file.util.js';
import { NESTS_FILE } from '../shoreline/config/paths.js';

/**
 * GET /api/dashboard/stats
 * Aggregates real-time data from all existing models for the home page.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    // ── Time boundaries ──
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // ── Run all queries in parallel ──
    const [
      // Turtles monitored
      turtlesTotal,
      turtlesThisWeek,
      turtlesPrevWeek,

      // Nest detections (from Detection model)
      nestDetections,

      // Active Alerts (both systems)
      shorelineActiveAlerts,
      hatcheryPendingAlerts,
      shorelineNewAlerts,

      // Hatchlings tracked (completed hatchery videos = hatchlings analyzed)
      hatchlingsThisMonth,
      hatchlingsPrevMonth,

      // Total detection scans
      totalScans,
      scansToday,

      // Threats detected (predator + human detections that are active threats)
      activeThreats,

      // Shoreline risk data
      shorelineHighRisk,
      shorelineLowRisk,
      latestShorelineAlert,

      // Health stats (already have an endpoint, but get fresh data)
      healthTotal,
      healthFp,
      healthBarnacles,
      healthHealthy,
    ] = await Promise.all([
      // Turtles monitored = total unique turtle detections
      Detection.countDocuments({ type: 'turtle' }),
      Detection.countDocuments({ type: 'turtle', timestamp: { $gte: oneWeekAgo } }),
      Detection.countDocuments({ type: 'turtle', timestamp: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),

      // Nest detections
      Detection.countDocuments({ type: 'nest' }),

      // Active shoreline alerts (new or acknowledged = require attention)
      Alert.countDocuments({ status: { $in: ['new', 'acknowledged'] } }),
      HatcheryAlert.countDocuments({ status: 'pending' }),
      Alert.countDocuments({ status: 'new' }),

      // Hatchlings: count completed hatchery videos this month vs last month
      HatcheryVideo.countDocuments({ status: 'completed', uploadDate: { $gte: oneMonthAgo } }),
      HatcheryVideo.countDocuments({ status: 'completed', uploadDate: { $gte: twoMonthsAgo, $lt: oneMonthAgo } }),

      // Total detection scans
      Detection.countDocuments(),
      Detection.countDocuments({ timestamp: { $gte: todayStart } }),

      // Active threats = predator or human detections with danger/warning status
      Detection.countDocuments({
        type: { $in: ['predator', 'human'] },
        nestStatus: { $in: ['danger', 'warning'] }
      }),

      // Shoreline risk counts
      Alert.countDocuments({ type: 'shoreline', riskLevel: 'high' }),
      Alert.countDocuments({ type: 'shoreline', riskLevel: 'low' }),
      Alert.findOne({ type: 'shoreline' }).sort({ createdAt: -1 }).lean(),

      // Health stats
      TurtleHealth.countDocuments(),
      TurtleHealth.countDocuments({ diagnosisClass: 'fp' }),
      TurtleHealth.countDocuments({ diagnosisClass: 'barnacles' }),
      TurtleHealth.countDocuments({ diagnosisClass: 'healthy' }),
    ]);

    // ── Derived values ──

    // Turtles trend: % change this week vs previous week
    const turtlesTrend = turtlesPrevWeek > 0
      ? Math.round(((turtlesThisWeek - turtlesPrevWeek) / turtlesPrevWeek) * 100)
      : (turtlesThisWeek > 0 ? 100 : 0);

    // Active nests: combine detection-based nests with shoreline JSON nests
    let shorelineNests = [];
    try {
      shorelineNests = readJson(NESTS_FILE, []);
    } catch (e) {
      // nests file may not exist
    }
    const activeNestsCount = nestDetections + (Array.isArray(shorelineNests) ? shorelineNests.length : 0);

    // Nests protected today = nest detections where status is safe, today
    const nestsProtectedToday = await Detection.countDocuments({
      type: 'nest',
      nestStatus: 'safe',
      timestamp: { $gte: todayStart }
    });

    // Total active alerts
    const totalActiveAlerts = shorelineActiveAlerts + hatcheryPendingAlerts;
    const alertsRequiringAttention = shorelineNewAlerts + hatcheryPendingAlerts;

    // Hatchlings trend
    const hatchlingsTrend = hatchlingsPrevMonth > 0
      ? Math.round(((hatchlingsThisMonth - hatchlingsPrevMonth) / hatchlingsPrevMonth) * 100)
      : (hatchlingsThisMonth > 0 ? 100 : 0);

    // Total hatchlings = all completed videos (each video represents hatchling tracking)
    const totalHatchlings = await HatcheryVideo.countDocuments({ status: 'completed' });

    // If no active threats from detection model, also count active predator/human detections
    let threatsCount = activeThreats;
    if (threatsCount === 0) {
      threatsCount = await Detection.countDocuments({
        type: { $in: ['predator', 'human'] },
        timestamp: { $gte: todayStart }
      });
    }

    // Shoreline risk level derivation
    const totalShorelineAlerts = await Alert.countDocuments({ type: 'shoreline' });
    const shorelineMediumRisk = await Alert.countDocuments({ type: 'shoreline', riskLevel: 'medium' });
    const stableCount = shorelineLowRisk + (totalShorelineAlerts - shorelineHighRisk - shorelineMediumRisk - shorelineLowRisk);

    // Determine current overall risk status
    let currentRiskStatus = 'Low';
    let riskMessage = 'All areas within safe parameters';
    if (latestShorelineAlert) {
      if (latestShorelineAlert.riskLevel === 'high') {
        currentRiskStatus = 'Critical';
        riskMessage = latestShorelineAlert.message || 'High risk detected';
      } else if (latestShorelineAlert.riskLevel === 'medium') {
        currentRiskStatus = 'Moderate';
        riskMessage = latestShorelineAlert.message || 'Moderate risk detected';
      } else {
        currentRiskStatus = 'Low';
        riskMessage = 'All areas within safe parameters';
      }
    }

    // Health diagnostics percentages
    const healthTotalSafe = healthTotal || 1; // avoid divide by zero
    const healthStats = {
      fp: {
        count: healthFp,
        percentage: (healthFp / healthTotalSafe * 100).toFixed(1)
      },
      barnacles: {
        count: healthBarnacles,
        percentage: (healthBarnacles / healthTotalSafe * 100).toFixed(1)
      },
      healthy: {
        count: healthHealthy,
        percentage: (healthHealthy / healthTotalSafe * 100).toFixed(1)
      }
    };

    // ── Response ──
    res.json({
      success: true,
      data: {
        // Top stats cards
        turtlesMonitored: {
          total: turtlesTotal,
          trend: turtlesTrend,
          period: 'this week'
        },
        activeNests: {
          total: activeNestsCount,
          protectedToday: nestsProtectedToday
        },
        activeAlerts: {
          total: totalActiveAlerts,
          requireAttention: alertsRequiringAttention
        },
        hatchlingsTracked: {
          total: totalHatchlings,
          trend: hatchlingsTrend,
          period: 'vs last month'
        },

        // Scan stats
        scans: {
          total: totalScans,
          today: scansToday
        },
        threats: {
          active: threatsCount
        },

        // Health diagnostics
        health: healthStats,

        // Shoreline risk
        shorelineRisk: {
          currentStatus: currentRiskStatus,
          message: riskMessage,
          highRisk: shorelineHighRisk,
          mediumRisk: shorelineMediumRisk,
          stable: stableCount > 0 ? stableCount : shorelineLowRisk,
          totalAlerts: totalShorelineAlerts
        }
      }
    });
  } catch (error) {
    console.error('[Dashboard] Stats aggregation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate dashboard stats',
      error: error.message
    });
  }
};
