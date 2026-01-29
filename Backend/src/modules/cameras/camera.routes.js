import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { cameraController } from './camera.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', cameraController.getCameras);
router.post('/', cameraController.addCamera);
router.put('/:id', cameraController.updateCamera);
router.delete('/:id', cameraController.deleteCamera);

export default router;
