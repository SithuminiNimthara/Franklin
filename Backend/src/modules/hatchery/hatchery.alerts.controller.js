import nodemailer from "nodemailer";
import { config } from "../../config/env.js";
import { HatcheryAlert } from "./hatchery.models.js";
import { Profile } from "../users/profile.model.js";

// Configure email transporter
const transporter = nodemailer.default
  ? nodemailer.default.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  : nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

export const sendAlertToActiveUsers = async (alertData) => {
  try {
    // Fetch all users who have email notifications enabled
    const profiles = await Profile.find({
      "notifications.email": true,
    });

    console.log(
      `Found ${profiles.length} user(s) with email notifications enabled`,
    );

    if (profiles.length === 0) {
      console.log("ℹNo users have email notifications enabled");
      return 0;
    }

    const emailPromises = profiles.map(async (profile) => {
      const toEmail = profile.email;

      if (!toEmail) {
        console.log(`No email found for profile: ${profile.clerkUserId}`);
        return;
      }

      const mailOptions = {
        from: config.smtp.from,
        to: toEmail,
        subject: `[ALERT] ${alertData.type.toUpperCase()} - ${alertData.tank}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #e11d48; padding: 24px; border-radius: 12px; max-width: 600px;">
            <h2 style="color: #e11d48; margin-top: 0; display: flex; align-items: center;">
            
              Hatchery Alert Detected
            </h2>
            <p style="font-size: 16px; color: #374151;">
              Hello ${profile.displayName || "Team Member"},<br/>
              An alert has been detected in the Franklin Hatchery Monitoring System.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #e11d48; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 40%;">Alert Type:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700; text-transform: uppercase;">${alertData.type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Tank:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700;">${alertData.tank}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Location:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700;">${alertData.location || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Detected Time:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700;">${new Date(alertData.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })} (SL Time)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Status:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700; text-transform: uppercase;">${alertData.status}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              <strong>Message:</strong> ${alertData.message}
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 3px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af;">
                <strong>Action Required:</strong> Please review the alert in your dashboard and take appropriate action.
              </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              This is an automated alert from the Franklin Hatchery Monitoring System.<br/>
              You're receiving this because you have email notifications enabled.<br/>
              <a href="http://localhost:5173/profile" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        // console.log(
        //   `Email sent to ${toEmail} (${profile.displayName || "Unknown"})`,
        // );
        return true;
      } catch (error) {
        console.error(`Failed to send email to ${toEmail}:`, error.message);
        return false;
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;

    // console.log(
    //   `Email Summary: ${successCount}/${profiles.length} sent successfully`,
    // );
    return successCount;
  } catch (error) {
    console.error("Failed to send alerts to users:", error.message);
    throw error;
  }
};

/**
 * Manual send - for when a user clicks "Send Email" button in frontend
 * This uses the authenticated user context from req.auth
 */
export const sendHatcheryEmailAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    // Handle Clerk's deprecated req.auth warning - use as function if available
    const userId =
      typeof req.auth === "function" ? req.auth().userId : req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Get user profile
    const profile = await Profile.findOne({ clerkUserId: userId });

    if (!profile || !profile.email) {
      return res.status(400).json({
        success: false,
        error: "User profile or email not found",
      });
    }

    // Get alert data
    const alert = await HatcheryAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: "Alert not found",
      });
    }

    // Send email to this specific user
    const mailOptions = {
      from: config.smtp.from,
      to: profile.email,
      subject: `[ALERT] ${alert.type.toUpperCase()} - ${alert.tank}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #e11d48; padding: 24px; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #e11d48; margin-top: 0;">⚠️ Hatchery Alert</h2>
          <p>Hello ${profile.displayName || "Team Member"},</p>
          <p>You requested details about the following alert:</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #e11d48; padding: 16px; margin: 20px 0;">
            <p><strong>Type:</strong> ${alert.type}</p>
            <p><strong>Tank:</strong> ${alert.tank}</p>
            <p><strong>Location:</strong> ${alert.location || "N/A"}</p>
            <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Franklin Hatchery Monitoring System
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    //console.log(`Manual alert email sent to ${profile.email}`);

    res.status(200).json({
      success: true,
      message: "Alert email sent successfully",
    });
  } catch (error) {
    console.error("Failed to send email alert:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
