import express from 'express';
import * as hatcheryController from './hatchery.controller.js';

const router = express.Router();

router.get('/stats/:tankId', hatcheryController.getTankStats);
router.get("/alerts", hatcheryController.getAlerts);

export default router;