import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 5002,
    mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/franklin",
    streamDir: path.join(process.cwd(), 'streams'),
    ffmpegPath: '',
    cameras: [
        { id: 'camera1', rtspUrl: 'rtsp://admin:EDSNNP@IP_Address:554/Streaming/Channels/101' },
    ],
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'it22143204@my.sliit.lk'
    },
    testModeSeconds: parseInt(process.env.TEST_MODE_SECONDS) || 120
};
