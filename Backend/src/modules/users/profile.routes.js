import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getMyProfile, updateMyProfile, getMySummary, getMySettings, updateMySettings } from './profile.controller.js';

const router = express.Router();

// All routes here are protected
router.use(requireAuth);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.get('/me/summary', getMySummary);
router.get('/me/settings', getMySettings);
router.put('/me/settings', updateMySettings);



export default router;
