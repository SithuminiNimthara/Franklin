import { streamingService } from './streaming.service.js';

export const streamingController = {
    getStatus: (req, res) => {
        try {
            const status = streamingService.getStatus();
            res.json({ success: true, data: status });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    getHealth: (req, res) => {
        try {
            const { cameraId } = req.params;
            const health = streamingService.getHealth(cameraId);
            res.json({ success: true, data: health });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
