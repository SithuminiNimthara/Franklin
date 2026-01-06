import mongoose from 'mongoose';

const turtleHealthSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    diagnosisClass: {
        type: String,
        enum: ['healthy', 'fp', 'barnacles'],
        required: true
    },
    confidence: {
        type: Number,
        required: true
    },
    probabilities: {
        healthy: Number,
        fp: Number,
        barnacles: Number
    },
    imageUrl: {
        type: String // Optional: if we store the image path
    },
    notes: String
});

export const TurtleHealth = mongoose.model('TurtleHealth', turtleHealthSchema);
