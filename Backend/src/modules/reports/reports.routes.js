import { Router } from "express";
import { reportsController } from "./reports.controller.js";

const router = Router();

router.get("/", reportsController.getAll);
router.post("/generate", reportsController.generate);
router.get("/:id/download", reportsController.download);
router.delete("/:id", reportsController.deleteReport);

export default router;
