import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'viewer' },
    notifications: {
        email: { type: Boolean, default: true },
        web: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
