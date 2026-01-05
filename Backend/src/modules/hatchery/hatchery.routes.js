import express from 'express';
import * as hatcheryController from './hatchery.controller.js';

const router = express.Router();

// Route: GET /api/hatchery/stats/:tankId
// Example: http://localhost:5000/api/hatchery/stats/tankA
router.get('/stats/:tankId', hatcheryController.getTankStats);

export default router;