import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false, // true for 465, false for other ports
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
    },
});

export const sendEmailAlert = async (req, res) => {
    try {
        const { toEmail, nestNo, zone, threatType, timestamp, durationSec, details, confidence } = req.body;

        if (!toEmail) {
            return res.status(400).json({ success: false, error: 'Recipient email is required' });
        }

        const mailOptions = {
            from: config.smtp.from,
            to: toEmail,
            subject: `[ALERT] Nest ${nestNo} in Danger - ${zone}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #e11d48; padding: 24px; border-radius: 12px; max-width: 600px;">
                    <h2 style="color: #e11d48; margin-top: 0; display: flex; items-center: center;">
                        <span style="font-size: 24px; margin-right: 10px;">⚠️</span> 
                        Nest Danger Alert
                    </h2>
                    <p style="font-size: 16px; color: #374151;">An immediate threat has been detected near one of our monitored turtle nests.</p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #e11d48; padding: 16px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 40%;">Nest Number:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700;">${nestNo}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Location/Zone:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700;">${zone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Threat Type:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700; text-transform: uppercase;">${threatType}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration Near Nest:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700;">${durationSec} seconds</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Detected Time:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700;">${new Date(timestamp).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })} (SL Time)</td>
                            </tr>
                            ${confidence ? `
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Confidence:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 700;">${(confidence * 100).toFixed(1)}%</td>
                            </tr>` : ''}
                        </table>
                    </div>

                    <p style="font-size: 14px; color: #6b7280;">
                        <strong>Details:</strong> ${details || 'N/A'}
                    </p>
                    
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                        This is an automated alert from the Franklin Nest Monitoring System.<br/>
                        Please take immediate action to protect the nesting site.
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Alert email sent to ${toEmail} for Nest ${nestNo}`);
        res.status(200).json({ success: true, message: 'Alert email sent successfully' });
    } catch (error) {
        console.error('Failed to send email alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
