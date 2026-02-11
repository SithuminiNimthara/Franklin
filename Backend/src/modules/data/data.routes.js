import express from 'express';
import { getTankStats } from '../hatchery/hatchery.controller.js';

const router = express.Router();

// GET /data/:tankId -> Forward to hatchery controller (which fetches from Python AI)
router.get('/:tankId', getTankStats);

export default router;
