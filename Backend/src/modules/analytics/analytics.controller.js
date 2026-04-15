import { analyticsService } from "./analytics.service.js";

export const analyticsController = {
  getSummary: async (req, res) => {
    try {
      const { range, from, to } = req.query;
      let filters = {};
      
      if (range === '24h') {
        filters.from = new Date(Date.now() - 24 * 60 * 60 * 1000);
        filters.to = new Date();
      } else if (range === '30d') {
        filters.from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        filters.to = new Date();
      } else if (from && to) {
        filters.from = new Date(from);
        filters.to = new Date(to);
      }

      const summary = await analyticsService.getSummary(filters);
      res.status(200).json(summary);
    } catch (error) {
      console.error("Error in getSummary:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  },

  getPerformance: async (req, res) => {
    try {
      const performance = await analyticsService.getPerformance();
      res.status(200).json(performance);
    } catch (error) {
      console.error("Error in getPerformance:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  },

  getTrends: async (req, res) => {
    try {
      const trends = await analyticsService.getTrends();
      res.status(200).json(trends);
    } catch (error) {
      console.error("Error in getTrends:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  }
};
