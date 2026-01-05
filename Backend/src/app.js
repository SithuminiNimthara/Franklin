import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import streamingRoutes from './modules/streaming/streaming.routes.js';
import turtlesRoutes from './modules/turtles/turtles.routes.js';
import nestsRoutes from './modules/nests/nests.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { streamingService } from './modules/streaming/streaming.service.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Services
streamingService.startAllCameras();

// Static Routes (Streaming)
// Serving the streams directory directly as before to maintain frontend compatibility
app.use('/streams', express.static(config.streamDir, {
    setHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// API Routes
app.use('/api/streaming', streamingRoutes);
app.use('/api/turtles', turtlesRoutes);
app.use('/api/nests', nestsRoutes);
app.use('/api/users', usersRoutes);

// Root route for basic health check (matches original behavior largely)
app.get('/', (req, res) => {
    res.send('Franklin Conservation Backend Running');
});

export default app;
