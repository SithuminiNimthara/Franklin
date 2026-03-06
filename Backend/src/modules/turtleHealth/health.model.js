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
        type: String 
    },
    location: {
        lat: Number,
        lng: Number
    },
    notes: String
});

export const TurtleHealth = mongoose.model('TurtleHealth', turtleHealthSchema);
