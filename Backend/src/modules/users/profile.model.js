import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
    clerkUserId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    displayName: { type: String },
    username: { type: String },
    phone: { type: String },
    station: { type: String },
    role: { type: String, default: 'Member' },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        weeklyReports: { type: Boolean, default: true }
    },
    preferences: {
        language: { type: String, default: 'English' },
        timeZone: { type: String, default: 'Pacific Time (PT)' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        theme: { type: String, default: 'Light' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ProfileSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export const Profile = mongoose.model('Profile', ProfileSchema);
