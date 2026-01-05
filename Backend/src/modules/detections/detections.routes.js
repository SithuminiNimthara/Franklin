import express from 'express';
import { createDetection, getDetections, getDetectionsByVideo } from '../detections.controller.js'

const router = express.Router();

router.post('/', createDetection);
router.get('/', getDetections);
router.get('/video/:videoId', getDetectionsByVideo);

export default router;
