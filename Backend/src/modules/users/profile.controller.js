import { Profile } from './profile.model.js';
import { clerkClient } from '../../middleware/auth.js';
import { Detection } from '../detections/detections.model.js';
import { Report } from '../reports/report.model.js';
import Alert from '../shoreline/models/alert.model.js';
import { HatcheryAlert } from '../hatchery/hatchery.models.js';

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.auth.userId;
        console.log('[Profile] GET /me - userId:', userId);

        let profile = await Profile.findOne({ clerkUserId: userId });

        if (!profile) {
            console.log('[Profile] First login detected. Initializing profile from Clerk for:', userId);

            // Fetch user details from Clerk
            const clerkUser = await clerkClient.users.getUser(userId);

            profile = await Profile.create({
                clerkUserId: userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                displayName: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser.username,
                username: clerkUser.username || '',
                lastLoginAt: new Date(), 
            });

            console.log('[Profile] Default profile created successfully');
        } else {
          
            await Profile.updateOne(
                { clerkUserId: userId },
                { $set: { lastLoginAt: new Date() } }
            );
        }

        res.json(profile);
    } catch (error) {
        console.error('[Profile] Get Profile Error:', error.message);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const updates = { ...req.body };

        console.log('[Profile] PUT /me - userId:', userId);

        // Security: Prevent updating clerkUserId, email, and DB fields
        delete updates.clerkUserId;
        delete updates.email;
        delete updates._id;
        delete updates.__v;

        const profile = await Profile.findOneAndUpdate(
            { clerkUserId: userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found. Please fetch it first.' });
        }

        console.log('[Profile] Update successful');
        res.json(profile);
    } catch (error) {
        console.error('[Profile] Update Profile Error:', error.message);
        res.status(500).json({ error: `Update failed: ${error.message}` });
    }
};

export const getMySummary = async (req, res) => {
    try {
        console.log('[Profile] GET /me/summary');
        
        // turtlesTagged: total turtles detected
        const turtlesTagged = await Detection.countDocuments({ type: 'turtle' });
        
        // reportsGenerated: total reports generated
        const reportsGenerated = await Report.countDocuments();
        
        // alertsResolved: total resolved alerts from both shoreline and hatchery
        const shorelineResolved = await Alert.countDocuments({ status: 'resolved' });
        const hatcheryResolved = await HatcheryAlert.countDocuments({ status: { $in: ['resolved', 'fixed'] } });
        
        const alertsResolved = shorelineResolved + hatcheryResolved;
        
        res.json({
            turtlesTagged,
            reportsGenerated,
            alertsResolved
        });
    } catch (error) {
        console.error('[Profile] Get Summary Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
};

export const getMySettings = async (req, res) => {
    try {
        const userId = req.auth.userId;
        console.log('[Profile] GET /me/settings - userId:', userId);

        let profile = await Profile.findOne({ clerkUserId: userId });

        if (!profile) {
            // Default settings if no profile exists yet
            return res.json({
                notifications: {
                    email: false,
                    sms: false,
                    push: true,
                    weeklyReports: true
                },
                preferences: {
                    theme: 'Light'
                }
            });
        }

        res.json({
            notifications: profile.notifications || {
                email: false,
                sms: false,
                push: true,
                weeklyReports: true
            },
            preferences: profile.preferences || {
                theme: 'Light'
            }
        });
    } catch (error) {
        console.error('[Profile] Get Settings Error:', error.message);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};

export const updateMySettings = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { notifications, preferences } = req.body;
        console.log('[Profile] PUT /me/settings - userId:', userId);

        const profile = await Profile.findOneAndUpdate(
            { clerkUserId: userId },
            {
                $set: {
                    notifications,
                    preferences
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            notifications: profile.notifications,
            preferences: profile.preferences
        });
    } catch (error) {
        console.error('[Profile] Update Settings Error:', error.message);
        res.status(500).json({ error: `Update failed: ${error.message}` });
    }
};

