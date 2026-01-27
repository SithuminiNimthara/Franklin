import nodemailer from 'nodemailer';
import { User } from '../users/users.model.js';
import { Detection } from '../detections/detections.model.js';

class NotificationService {
    constructor() {
        this.io = null; // Socket.io instance
        this.threats = new Map(); // Track threat stay duration: { nestId: { threatType: { startTime: Date, lastSeen: Date } } }

        // Transporter setup
        // Note: For actual usage, the user would need to provide a password/app password
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'it22143204@my.sliit.lk',
                pass: 'vclq xoxm svst hkgc' // Placeholder or USER should provide it. 
                // I will use a dummy one and explain to User how to set it.
            }
        });
    }

    setSocketIO(io) {
        this.io = io;
    }

    async trackDetection(detection) {
        if (detection.type === 'human' || detection.type === 'predator') {
            await this.checkThreatDistance(detection);
        }
    }

    async checkThreatDistance(detection) {
        // Find nearby nests
        // A simple distance threshold (e.g., 5 units in the 100x100 map)
        const THRESHOLD = 10.0;
        const nests = await Detection.find({ type: 'nest' });

        for (const nest of nests) {
            const dx = nest.location.coordinates.x - detection.location.coordinates.x;
            const dy = nest.location.coordinates.y - detection.location.coordinates.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < THRESHOLD) {
                const threatKey = `${nest._id}_${detection.type}`;
                const now = new Date();

                if (!this.threats.has(threatKey)) {
                    this.threats.set(threatKey, {
                        startTime: now,
                        lastSeen: now,
                        nest: nest,
                        detection: detection
                    });
                } else {
                    const threat = this.threats.get(threatKey);
                    threat.lastSeen = now;

                    const durationSeconds = (threat.lastSeen - threat.startTime) / 1000;

                    // 120 seconds = 2 minutes
                    if (durationSeconds >= 120 && !threat.alerted) {
                        threat.alerted = true;
                        this.triggerAlert(threat);
                    }
                }
            }
        }

        // Cleanup stale threats (not seen for 10 seconds)
        for (const [key, threat] of this.threats.entries()) {
            if (new Date() - threat.lastSeen > 10000) {
                this.threats.delete(key);
            }
        }
    }

    async triggerAlert(threat) {
        const { nest, detection } = threat;
        const alertData = {
            nestId: nest.details || nest._id,
            location: `Zone: ${nest.location.zone} (${nest.location.coordinates.x.toFixed(1)}, ${nest.location.coordinates.y.toFixed(1)})`,
            time: new Date().toLocaleString(),
            threatType: detection.type,
            details: `A ${detection.type} has been near the nest for over 2 minutes.`
        };

        console.log('--- TRIGGERING ALERTS ---', alertData);

        // 1. Web Alert (Socket.io)
        if (this.io) {
            this.io.emit('danger_alert', alertData);
        }

        // 2. Email Alert
        await this.sendEmailAlert(alertData);
    }

    async sendEmailAlert(alertData) {
        try {
            const users = await User.find({ "notifications.email": true });

            for (const user of users) {
                const mailOptions = {
                    from: 'it22143204@my.sliit.lk',
                    to: user.email,
                    subject: `⚠️ DANGER ALERT: Nest #${alertData.nestId} Under Threat`,
                    html: `
                        <div style="font-family: Arial, sans-serif; border: 2px solid #ff4444; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #ff4444;">🚨 Nest Danger Alert 🚨</h2>
                            <p>An immediate threat has been detected near a turtle nest.</p>
                            <hr/>
                            <p><strong>Nest ID:</strong> ${alertData.nestId}</p>
                            <p><strong>Threat Type:</strong> ${alertData.threatType.toUpperCase()}</p>
                            <p><strong>Location:</strong> ${alertData.location}</p>
                            <p><strong>Time Detected:</strong> ${alertData.time}</p>
                            <p><strong>Details:</strong> ${alertData.details}</p>
                            <hr/>
                            <p style="font-size: 12px; color: #666;">This is an automated alert from the Franklin Conservation System.</p>
                        </div>
                    `
                };

                await this.transporter.sendMail(mailOptions);
                console.log(`Email sent to ${user.email}`);
            }
        } catch (error) {
            console.error('Failed to send email alert:', error);
        }
    }
}

export const notificationService = new NotificationService();
