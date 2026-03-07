import { TurtleHealth } from './health.model.js';
import { HatcheryAlert } from '../hatchery/hatchery.models.js';
import { sendAlertToActiveUsers } from '../hatchery/hatchery.alerts.controller.js';
import { uploadToGoogleDrive } from '../../services/googleDrive.service.js';

export const saveHealthDiagnosis = async (req, res) => {
    try {
        let { diagnosisClass, confidence, probabilities, imageUrl, notes, location } = req.body;

        if (typeof probabilities === 'string') probabilities = JSON.parse(probabilities);
        if (typeof location === 'string') location = JSON.parse(location);
        if (typeof confidence === 'string') confidence = parseFloat(confidence);

        // Upload image to Google Drive if a file was provided
        if (req.file) {
            try {
                const timestamp = Date.now();
                const fileName = `turtle_diagnosis_${diagnosisClass}_${timestamp}.jpg`;
                const result = await uploadToGoogleDrive(
                    req.file.buffer,
                    fileName,
                    req.file.mimetype || 'image/jpeg'
                );
                imageUrl = result.directLink;
                console.log(`✅ Image uploaded to Google Drive: ${imageUrl}`);
            } catch (driveError) {
                console.error('⚠️ Google Drive upload failed, saving diagnosis without image:', driveError.message);
                // Continue saving the diagnosis even if Drive upload fails
            }
        }

        const newDiagnosis = new TurtleHealth({
            diagnosisClass,
            confidence,
            probabilities,
            imageUrl,
            location,
            notes
        });

        const savedDiagnosis = await newDiagnosis.save();

        if (diagnosisClass === 'fp' || diagnosisClass === 'barnacles') {
            const diseaseName = diagnosisClass === 'fp' ? 'Fibropapillomatosis (FP)' : 'Barnacles';
            const confPercent = (confidence * 100).toFixed(1);

            const alert = new HatcheryAlert({
                type: "health_warning",
                message: `CRITICAL: A turtle was diagnosed with ${diseaseName} (Confidence: ${confPercent}%). Immediate isolation and medical attention required.`,
                tank: "Diagnostic Center",
                location: location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Unknown"
            });

            await alert.save();

            sendAlertToActiveUsers(alert)
                .then(count => console.log(`Health alert emails sent to ${count} user(s)`))
                .catch(err => console.error("Email failed:", err.message));
        }

        res.status(201).json({
            success: true,
            data: savedDiagnosis
        });
    } catch (error) {
        console.error('Error saving health diagnosis:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save diagnosis',
            error: error.message
        });
    }
};

export const getHealthStats = async (req, res) => {
    try {
        // Get last 24h count
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentScans = await TurtleHealth.countDocuments({ timestamp: { $gte: oneDayAgo } });

        // Get all time stats
        const totalHealthy = await TurtleHealth.countDocuments({ diagnosisClass: 'healthy' });
        const totalFp = await TurtleHealth.countDocuments({ diagnosisClass: 'fp' });
        const totalBarnacles = await TurtleHealth.countDocuments({ diagnosisClass: 'barnacles' });
        const total = totalHealthy + totalFp + totalBarnacles || 1; // avoid divide by zero

        res.json({
            recentScans,
            stats: {
                healthy: { count: totalHealthy, percentage: (totalHealthy / total * 100).toFixed(1) },
                fp: { count: totalFp, percentage: (totalFp / total * 100).toFixed(1) },
                barnacles: { count: totalBarnacles, percentage: (totalBarnacles / total * 100).toFixed(1) }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRecentDiagnoses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await TurtleHealth.countDocuments();
        const diagnoses = await TurtleHealth.find()
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            diagnoses,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
            total
        });
    } catch (error) {
        console.error('Error fetching recent diagnoses:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getHealthLocations = async (req, res) => {
    try {
        const records = await TurtleHealth.find(
            { 'location.lat': { $exists: true, $ne: null } },
            { diagnosisClass: 1, confidence: 1, location: 1, timestamp: 1, _id: 0 }
        ).sort({ timestamp: -1 });

        const locations = records.map(r => ({
            lat: r.location.lat,
            lng: r.location.lng,
            class: r.diagnosisClass,
            confidence: r.confidence,
            timestamp: r.timestamp
        }));

        res.json(locations);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
