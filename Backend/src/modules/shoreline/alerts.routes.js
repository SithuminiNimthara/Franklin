import { Router } from "express";
import {
  listAlerts,
  getAlert,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  deleteAlert,
} from "./alerts.controller.js";

const router = Router();

router.get("/", listAlerts);
router.get("/:id", getAlert);

router.post("/", createAlert);

router.patch("/:id/ack", acknowledgeAlert);
router.patch("/:id/resolve", resolveAlert);

router.delete("/:id", deleteAlert);

export default router;
