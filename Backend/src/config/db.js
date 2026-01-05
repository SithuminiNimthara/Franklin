import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};
