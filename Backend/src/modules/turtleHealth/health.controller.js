import { TurtleHealth } from './health.model.js';
import { HatcheryAlert } from '../hatchery/hatchery.models.js';
import { sendAlertToActiveUsers } from '../hatchery/hatchery.alerts.controller.js';

export const saveHealthDiagnosis = async (req, res) => {
    try {
        let { diagnosisClass, confidence, probabilities, imageUrl, notes, location } = req.body;

        if (typeof probabilities === 'string') probabilities = JSON.parse(probabilities);
        if (typeof location === 'string') location = JSON.parse(location);

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
        const diagnoses = await TurtleHealth.find().sort({ timestamp: -1 }).limit(10);
        res.json(diagnoses);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
