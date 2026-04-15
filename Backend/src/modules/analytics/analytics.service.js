import { Detection } from "../detections/detections.model.js";
import { TurtleHealth } from "../turtleHealth/health.model.js";
import Alert from "../shoreline/models/alert.model.js";
import { HatcheryVideo, HatcheryAlert } from "../hatchery/hatchery.models.js";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300 });

export const analyticsService = {
  getSummary: async (filters = {}) => {
    const cacheKey = `summary_${JSON.stringify(filters)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const { from, to } = filters;
    const dateQuery = from && to ? { createdAt: { $gte: new Date(from), $lte: new Date(to) } } : {};
    
    // For models that use timestamp instead of createdAt
    const timestampQuery = from && to ? { timestamp: { $gte: new Date(from), $lte: new Date(to) } } : {};
    const uploadDateQuery = from && to ? { uploadDate: { $gte: new Date(from), $lte: new Date(to) } } : {};

    const [
      totalReports,
      totalHealthRecords,
      totalNestEvents,
      totalShorelineAlerts,
      totalHatcheryVideos
    ] = await Promise.all([
      // Assuming Report is what they meant by totalReports or maybe sum of all?
      // Actually, user said totalReports, totalHealthRecords, totalNestEvents, etc.
      // I'll count each collection.
      Detection.countDocuments(timestampQuery),
      TurtleHealth.countDocuments(timestampQuery),
      Detection.countDocuments({ ...timestampQuery, type: 'nest' }),
      Alert.countDocuments(dateQuery),
      HatcheryVideo.countDocuments(uploadDateQuery)
    ]);

    // Monthly Growth Calculation
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthCount = await Detection.countDocuments({ timestamp: { $gte: startOfCurrentMonth } }) +
                               await TurtleHealth.countDocuments({ timestamp: { $gte: startOfCurrentMonth } }) +
                               await Alert.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }) +
                               await HatcheryVideo.countDocuments({ uploadDate: { $gte: startOfCurrentMonth } });

    const previousMonthCount = await Detection.countDocuments({ timestamp: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } }) +
                                await TurtleHealth.countDocuments({ timestamp: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } }) +
                                await Alert.countDocuments({ createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } }) +
                                await HatcheryVideo.countDocuments({ uploadDate: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } });

    let monthlyGrowthPercent = 0;
    if (previousMonthCount > 0) {
      monthlyGrowthPercent = ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100;
    } else if (currentMonthCount > 0) {
      monthlyGrowthPercent = 100;
    }

    const result = {
      totalReports: currentMonthCount + previousMonthCount, // Total combined or just all time? User might mean all time.
      // Let's go with all time for total counts as usually expected in dashboards
      totalHealthRecords,
      totalNestEvents,
      totalShorelineAlerts,
      totalHatcheryVideos,
      monthlyGrowthPercent: parseFloat(monthlyGrowthPercent.toFixed(2))
    };

    // Fix totalReports to be sum of all time
    const allTimeCount = await Detection.countDocuments({}) +
                         await TurtleHealth.countDocuments({}) +
                         await Alert.countDocuments({}) +
                         await HatcheryVideo.countDocuments({});
    result.totalReports = allTimeCount;

    cache.set(cacheKey, result);
    return result;
  },

  getPerformance: async () => {
    const cacheKey = "performance_stats";
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const [turtleStats, nestStats, hatcheryStats, shorelineStats] = await Promise.all([
      // Turtle Health Rate
      TurtleHealth.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } }
          }
        },
        {
          $project: {
            rate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$healthy", "$total"] }, 100] },
                0
              ]
            }
          }
        }
      ]),
      // Nest Success Rate
      Detection.aggregate([
        { $match: { type: "nest" } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            safe: { $sum: { $cond: [{ $eq: ["$nestStatus", "safe"] }, 1, 0] } }
          }
        },
        {
          $project: {
            rate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$safe", "$total"] }, 100] },
                0
              ]
            }
          }
        }
      ]),
      // Hatching Survival Rate
      HatcheryVideo.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            survival: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$analysis.health", "Healthy"] }, { $eq: ["$status", "completed"] }] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            rate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$survival", "$total"] }, 100] },
                0
              ]
            }
          }
        }
      ]),
      // Conflict Mitigation Rate
      Alert.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
          }
        },
        {
          $project: {
            rate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] },
                0
              ]
            }
          }
        }
      ])
    ]);

    const result = {
      turtleHealthRate: turtleStats[0]?.rate ? parseFloat(turtleStats[0].rate.toFixed(2)) : 0,
      nestSuccessRate: nestStats[0]?.rate ? parseFloat(nestStats[0].rate.toFixed(2)) : 0,
      hatchingSurvivalRate: hatcheryStats[0]?.rate ? parseFloat(hatcheryStats[0].rate.toFixed(2)) : 0,
      conflictMitigationRate: shorelineStats[0]?.rate ? parseFloat(shorelineStats[0].rate.toFixed(2)) : 0
    };

    cache.set(cacheKey, result);
    return result;
  },

  getTrends: async () => {
    const cacheKey = "trends_stats";
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const aggregateByMonth = async (Model, dateField, match = {}) => {
      return Model.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              month: { $month: `$${dateField}` },
              year: { $year: `$${dateField}` }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);
    };

    const [healthTrends, nestTrends, riskTrends, hatcheryTrends] = await Promise.all([
      TurtleHealth.aggregate([
        {
          $group: {
            _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
            healthy: { $sum: { $cond: [{ $eq: ["$diagnosisClass", "healthy"] }, 1, 0] } },
            unhealthy: { $sum: { $cond: [{ $ne: ["$diagnosisClass", "healthy"] }, 1, 0] } }
          }
        }
      ]),
      Detection.aggregate([
        { $match: { type: "nest" } },
        {
          $group: {
            _id: { month: { $month: "$timestamp" }, year: { $year: "$timestamp" } },
            safe: { $sum: { $cond: [{ $eq: ["$nestStatus", "safe"] }, 1, 0] } }
          }
        }
      ]),
      Alert.aggregate([
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            alerts: { $sum: 1 }
          }
        }
      ]),
      HatcheryVideo.aggregate([
        {
          $group: {
            _id: { month: { $month: "$uploadDate" }, year: { $year: "$uploadDate" } },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
          }
        }
      ])
    ]);

    // Merge trends
    const mergedData = {};
    const process = (data, keyMapping) => {
      data.forEach(item => {
        const period = `${months[item._id.month - 1]} ${item._id.year}`;
        if (!mergedData[period]) {
          mergedData[period] = { month: months[item._id.month - 1], year: item._id.year, healthyTurtles: 0, unhealthyTurtles: 0, safeNests: 0, riskAlerts: 0, hatcheryCompleted: 0 };
        }
        for (const [key, val] of Object.entries(keyMapping)) {
          mergedData[period][key] = item[val] || 0;
        }
      });
    };

    process(healthTrends, { healthyTurtles: 'healthy', unhealthyTurtles: 'unhealthy' });
    process(nestTrends, { safeNests: 'safe' });
    process(riskTrends, { riskAlerts: 'alerts' });
    process(hatcheryTrends, { hatcheryCompleted: 'completed' });

    const result = Object.values(mergedData).sort((a, b) => (a.year - b.year) || (months.indexOf(a.month) - months.indexOf(b.month)));
    
    cache.set(cacheKey, result);
    return result;
  },

  clearCache: () => {
    cache.flushAll();
  }
};
