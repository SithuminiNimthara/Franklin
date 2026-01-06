import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('MongoDB Connected Successfully (Cloud)');
    } catch (error) {
        console.error('Cloud MongoDB Connection Failed:', error.message);
        try {
            console.log('Attempting to connect to Local MongoDB...');
            await mongoose.connect('mongodb://127.0.0.1:27017/franklin');
            console.log('MongoDB Connected Successfully (Local)');
        } catch (localError) {
            console.error('Local MongoDB Connection Failed:', localError.message);
            console.log('Running without Database (Some features will be limited)');
            // Do not exit process, allow server to run for other features
        }
    }
};
