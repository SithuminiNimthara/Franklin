import { TurtleHealth } from './health.model.js';
import { google } from 'googleapis';
import stream from 'stream';
import path from 'path';

// Google Drive Auth Configuration
const FOLDER_ID = '1GozwiRc0y_gMstAtSxI8MV_7ZwOq8b76';
const KEYFILEPATH = path.join(process.cwd(), 'google-credentials.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/drive']
});

const uploadImageToDrive = async (fileObject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const driveService = google.drive({ version: 'v3', auth });

    const { data } = await driveService.files.create({
        media: {
            mimeType: fileObject.mimetype,
            body: bufferStream,
        },
        requestBody: {
            name: `Franklin-Diagnosis_${Date.now()}.jpg`,
            parents: [FOLDER_ID],
        },
        fields: 'id, webViewLink, webContentLink',
    });

    try {
        await driveService.permissions.create({
            fileId: data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    } catch (permError) {
        console.warn("Could not make file public (likely an organization restriction), but it was saved successfully.", permError.message);
    }

    return data.webViewLink;
};
export const saveHealthDiagnosis = async (req, res) => {
    try {
        let { diagnosisClass, confidence, probabilities, imageUrl, notes, location } = req.body;

        if (typeof probabilities === 'string') probabilities = JSON.parse(probabilities);
        if (typeof location === 'string') location = JSON.parse(location);

        if (req.file) {
            imageUrl = await uploadImageToDrive(req.file);
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
