import express from 'express';
import { saveHealthDiagnosis, getHealthStats, getRecentDiagnoses, getHealthLocations } from './health.controller.js';

const router = express.Router();

router.post('/save', saveHealthDiagnosis);
router.get('/stats', getHealthStats);
router.get('/recent', getRecentDiagnoses);
router.get('/locations', getHealthLocations);

export default router;
