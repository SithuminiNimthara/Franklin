import { Detection } from './detections.model.js';
import { notificationService } from '../notifications/notification.service.js';

export const createDetection = async (req, res) => {
    try {
        const detection = new Detection(req.body);
        await detection.save();

        // Track threat logic
        notificationService.trackDetection(detection);

        res.status(201).json({ success: true, data: detection });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getDetections = async (req, res) => {
    try {
        const detections = await Detection.find().sort({ timestamp: -1 }).limit(50);
        res.status(200).json({ success: true, data: detections });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getDetectionsByVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const detections = await Detection.find({ videoSource: videoId }).sort({ timestamp: 1 });
        res.status(200).json({ success: true, data: detections });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
