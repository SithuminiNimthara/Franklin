import mongoose from 'mongoose';

const DetectionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['turtle', 'predator', 'human', 'nest'] // Extended to include 'nest' if needed
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    location: {
        zone: String, // e.g., 'Beach Zone A'
        coordinates: {
            x: Number,
            y: Number
        }
    },
    confidence: Number,
    nestStatus: {
        type: String, // e.g., 'safe', 'warning', 'danger'
        default: 'safe'
    },
    details: String, // Extra info
    videoSource: String // ID of the video file if simulation
});

export const Detection = mongoose.model('Detection', DetectionSchema);
