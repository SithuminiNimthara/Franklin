import mongoose from 'mongoose';

const CameraSchema = new mongoose.Schema({
    clerkUserId: { type: String, required: true },
    name: { type: String, required: true },
    ipAddress: { type: String, required: true },
    isMain: { type: Boolean, default: false },
    rtspUrl: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

CameraSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export const Camera = mongoose.model('Camera', CameraSchema);
