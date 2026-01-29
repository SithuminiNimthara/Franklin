import express from 'express';
import { sendEmailAlert } from './alerts.controller.js';

const router = express.Router();

router.post('/email', sendEmailAlert);

export default router;
