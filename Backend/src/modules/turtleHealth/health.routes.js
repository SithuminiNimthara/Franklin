import express from 'express';
import multer from 'multer';
import { saveHealthDiagnosis, getHealthStats, getRecentDiagnoses } from './health.controller.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/save', upload.single('image'), saveHealthDiagnosis);
router.get('/stats', getHealthStats);
router.get('/recent', getRecentDiagnoses);

export default router;
