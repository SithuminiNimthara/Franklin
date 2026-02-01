import Alert from "../models/alert.model.js";
import { getTransporter, getFromAddress } from "./mailer.service.js";

const COOLDOWN_MIN = Number(process.env.ALERT_EMAIL_COOLDOWN_MIN || 10);

function envRecipientsList() {
  return String(process.env.SHORELINE_ALERT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveRecipients(overrideRecipients) {
  const override = Array.isArray(overrideRecipients)
    ? overrideRecipients.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (override.length > 0) return override;
  return envRecipientsList();
}

async function canSendByCooldown(cooldownKey) {
  if (!cooldownKey) return true;

  const since = new Date(Date.now() - COOLDOWN_MIN * 60 * 1000);

  const recent = await Alert.findOne({
    cooldownKey,
    createdAt: { $gte: since },
  }).lean();

  return !recent;
}

function buildEmailHtml(alertDoc) {
  const env = alertDoc?.details?.environment || {};
  const evaln = alertDoc?.details?.evaluation || {};

  return `
  <div style="font-family: Arial, sans-serif; border: 2px solid #e11d48; padding: 18px; border-radius: 10px;">
    <h2 style="color:#e11d48; margin-top:0;">🚨 Shoreline HIGH RISK</h2>
    <p><b>Message:</b> ${alertDoc.message}</p>
    <p><b>Time:</b> ${new Date(alertDoc.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}</p>

    <hr/>

    <p><b>Boundary crossed:</b> ${String(evaln.boundaryCrossed)}</p>
    <p><b>Nests at risk:</b> ${evaln.nestsAtRisk?.length || 0}</p>

    <h3>Environment</h3>
    <ul>
      <li>Rain (last 3h): <b>${env?.rain?.last3h_mm ?? "N/A"} mm</b></li>
      <li>Rain (next 6h): <b>${env?.rain?.next6h_mm ?? "N/A"} mm</b></li>
      <li>Tide height: <b>${env?.tide?.height_m ?? "N/A"} m</b></li>
      <li>Tide trend: <b>${env?.tide?.trend ?? "unknown"}</b></li>
      <li>Env source: <b>${env?.source ?? "unknown"}</b></li>
    </ul>

    <p style="color:#6b7280; font-size:12px;">
      Automated alert from TurtleGuard Shoreline Monitoring.
    </p>
  </div>`;
}

export async function sendShorelineAlertEmail(alertDoc, { recipients } = {}) {
  const transporter = getTransporter();
  const to = resolveRecipients(recipients);

  if (!transporter) {
    console.warn("Email not sent: transporter not ready");
    return { sent: false, reason: "no_transporter" };
  }

  if (to.length === 0) {
    console.warn("Email not sent: recipients empty (override + env are empty)");
    return { sent: false, reason: "no_recipients" };
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to: to.join(","),
    subject: `🚨 Shoreline HIGH RISK: ${alertDoc.message}`,
    html: buildEmailHtml(alertDoc),
  });

  return { sent: true, to };
}

export async function notifyIfAllowed({ alertDoc, recipients } = {}) {
  const ok = await canSendByCooldown(alertDoc?.cooldownKey);
  if (!ok) return { sent: false, reason: "cooldown" };

  return await sendShorelineAlertEmail(alertDoc, { recipients });
}
