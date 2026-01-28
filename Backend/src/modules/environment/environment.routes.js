import { Router } from "express";
import {
  getCurrentEnvironment,
  saveManualEnvironment,
} from "./environment.controller.js";

const router = Router();

router.get("/current", getCurrentEnvironment);
router.post("/manual", saveManualEnvironment);

export default router;
