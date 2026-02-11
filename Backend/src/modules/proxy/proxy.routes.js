import express from 'express';
import axios from 'axios';
import { config } from '../../config/env.js';

const router = express.Router();

/**
 * Proxy POST /api/unified/analyze -> AI_SERVICE/ai/unified/analyze
 * Supports both JSON (via req.body) and Multipart/File uploads (via stream piping).
 */
router.post('/analyze', async (req, res) => {
    const targetUrl = `${config.models.unified}/ai/unified/analyze`;

    try {
        // If request is multipart (file upload), stream it to preserve memory
        if (req.is('multipart/form-data')) {
            const response = await axios({
                method: 'post',
                url: targetUrl,
                data: req,
                headers: {
                    'Content-Type': req.headers['content-type'], // Preserve boundary
                },
                responseType: 'arraybuffer', // Get response as buffer to safely send back
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            // Check content type of response
            res.set('Content-Type', response.headers['content-type']);
            return res.status(response.status).send(response.data);
        }

        // Otherwise assume JSON/UrlEncoded (parsed by express.json middleware)
        const response = await axios.post(targetUrl, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: () => true // Allow non-200 responses to be handled manually
        });

        if (response.status >= 400) {
            console.error(`[Proxy] Upstream error ${response.status} from ${targetUrl}:`, response.data);
            return res.status(response.status).json(response.data);
        }

        res.json(response.data);

    } catch (error) {
        console.error(`[Proxy Fatal] Connection failed to ${targetUrl}`);
        console.error(`Reason: ${error.message} (Code: ${error.code})`);

        if (error.code === 'ECONNREFUSED') {
            return res.status(502).json({
                error: 'AI Service Unavailable',
                details: 'Connection refused. Check AI_SERVICE_URL settings.'
            });
        }
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                error: 'AI Service Timeout',
                details: 'The AI service took too long to respond (likely spinning up).'
            });
        }

        res.status(502).json({
            error: 'AI Proxy Error',
            details: error.message
        });
    }
});

// Proxy for Disease Detection (Turtle Health) if needed
router.post('/classify', async (req, res) => {
    // Assuming the user might map this to a different endpoint or same service
    // TurtleHealthPage calls /classify
    const targetUrl = `${config.models.disease}/classify`;

    try {
        if (req.is('multipart/form-data')) {
            const response = await axios({
                method: 'post',
                url: targetUrl,
                data: req,
                headers: { 'Content-Type': req.headers['content-type'] },
                responseType: 'arraybuffer',
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
            res.set('Content-Type', response.headers['content-type']);
            return res.status(response.status).send(response.data);
        }

        const response = await axios.post(targetUrl, req.body);
        res.json(response.data);
    } catch (error) {
        console.error(`[Proxy] Error forwarding to ${targetUrl}:`, error.message);
        res.status(502).json({ error: 'AI Service Unavailable' });
    }
});

router.get('/health', async (req, res) => {
    try {
        await axios.get(`${config.models.unified}/health`, { timeout: 1000 });
        res.json({ status: 'Online', service: 'AI Unified' });
    } catch (e) {
        res.status(503).json({ status: 'Offline', service: 'AI Unified' });
    }
});

export default router;
