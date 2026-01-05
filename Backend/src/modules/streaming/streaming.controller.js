import { streamingService } from './streaming.service.js';
import { config } from '../../config/env.js';

export const streamingController = {
    getStatus: (req, res) => {
        const streams = config.cameras.map(c => `/streams/${c.id}/stream.m3u8`);
        res.json({
            message: 'EZVIZ HLS streaming server operational',
            streams
        });
    }
};
