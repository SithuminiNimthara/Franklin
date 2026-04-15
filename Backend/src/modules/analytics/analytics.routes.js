import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";

const router = Router();

router.get("/summary", analyticsController.getSummary);
router.get("/performance", analyticsController.getPerformance);
router.get("/trends", analyticsController.getTrends);

export default router;
