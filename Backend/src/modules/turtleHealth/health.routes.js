import express from 'express';
import { saveHealthDiagnosis, getHealthStats, getRecentDiagnoses } from './health.controller.js';

const router = express.Router();

router.post('/save', saveHealthDiagnosis);
router.get('/stats', getHealthStats);
router.get('/recent', getRecentDiagnoses);

export default router;
