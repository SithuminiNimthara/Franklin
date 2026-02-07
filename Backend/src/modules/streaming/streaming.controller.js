import fs from 'fs';
import { streamingService } from './streaming.service.js';
import { config } from '../../config/env.js';

export const streamingController = {
    getStatus: (req, res) => {
        const statuses = streamingService.getStreamingStatus();
        res.json({
            message: 'EZVIZ HLS streaming server operational',
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
                size: stats.size,
                url: `/streams/${cameraId}/stream.m3u8`
            });
        } else {
            res.status(404).json({
                status: 'inactive',
                message: 'Stream file not found'
            });
        }
    }
};
