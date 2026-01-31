import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: process.env.PORT || 5002,
    mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/franklin",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    streamDir: path.join(process.cwd(), 'streams'),
    streamingEnabled: process.env.STREAMING_ENABLED === 'true',
    models: {
        unified: process.env.PY_UNIFIED_URL || "http://localhost:8000",
        disease: process.env.PY_DISEASE_URL || "http://localhost:8001",
        shoreline: process.env.PY_SHORELINE_URL || "http://localhost:9000",
        hatchery: process.env.PY_HATCHERY_URL || "http://localhost:5001"
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'it22143204@my.sliit.lk'
    }
};
