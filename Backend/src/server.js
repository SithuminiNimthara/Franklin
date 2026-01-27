import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { config } from './config/env.js';
import { notificationService } from './modules/notifications/notification.service.js';

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Pass io to notification service
notificationService.setSocketIO(io);

io.on('connection', (socket) => {
    console.log('Client connected for real-time alerts');
});

server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
});
