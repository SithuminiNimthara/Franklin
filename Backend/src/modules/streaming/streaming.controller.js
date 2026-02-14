import fs from 'fs';
import path from 'path';
import { streamingService } from './streaming.service.js';
import { Camera } from '../cameras/camera.model.js';

export const streamingController = {
    getStatus: (req, res) => {
        const statuses = streamingService.getStreamingStatus();
        res.json({
            message: 'Franklin Streaming Server Operational',
            activeStreams: statuses.length,
            streams: statuses
        });
    },

    getHealth: (req, res) => {
        const { cameraId } = req.params;
        const streamPath = streamingService.getStreamPath(cameraId);

        if (fs.existsSync(streamPath)) {
            const stats = fs.statSync(streamPath);
            res.json({
                status: 'active',
                lastModified: stats.mtime,
                url: `/streams/${cameraId}/stream.m3u8`
            });
        } else {
            res.status(404).json({
                status: 'inactive',
                message: 'Stream file not found'
            });
        }
    },

    /**
     * MJPEG Proxy for Tanks
     * Returns the stream from a camera or an "Offline" message
     */
    proxyTank: async (req, res) => {
        const { tankId } = req.params;
        try {
            // Find camera associated with this tank or use a fallback
            const camera = await Camera.findOne({ isEnabled: true }); // Simplification: get first enabled camo

            if (!camera) {
                return res.status(200).json({
                    status: "Offline",
                    message: "No cameras configured or enabled."
                });
            }

            // In a real MJPEG proxy, we would spawn FFmpeg and pipe to res
            // For now, if HLS exists, we point them there via JSON error to keep frontend from crashing
            res.status(200).json({
                status: "Live",
                type: "HLS",
                streamUrl: `/streams/${camera._id}/stream.m3u8`,
                telemetry: {
                    temp: "28.5°C",
                    ph: "8.1"
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};
