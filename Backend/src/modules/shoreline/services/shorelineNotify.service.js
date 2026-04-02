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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRiskLabel(riskLevel) {
  const risk = String(riskLevel || "low").toLowerCase();
  if (risk === "high") return "HIGH RISK";
  if (risk === "medium") return "MEDIUM RISK";
  return "LOW RISK";
}

function riskColors(riskLevel) {
  const risk = String(riskLevel || "low").toLowerCase();

  if (risk === "high") {
    return {
      primary: "#dc2626",
      soft: "#fef2f2",
      border: "#fecaca",
      badgeBg: "#dc2626",
      badgeText: "#ffffff",
    };
  }

  if (risk === "medium") {
    return {
      primary: "#d97706",
      soft: "#fffbeb",
      border: "#fde68a",
      badgeBg: "#f59e0b",
      badgeText: "#ffffff",
    };
  }

  return {
    primary: "#16a34a",
    soft: "#f0fdf4",
    border: "#bbf7d0",
    badgeBg: "#16a34a",
    badgeText: "#ffffff",
  };
}

function getAlertDetails(alertDoc) {
  const details = alertDoc?.details || {};
  const evaluation = details.evaluation || {};
  const environment = details.environment || {};

  const boundaryCrossed =
    details.boundaryCrossed ?? evaluation.boundaryCrossed ?? false;

  const nestsAtRisk =
    details.nestsAtRisk ||
    details.threatenedNests ||
    evaluation.nestsAtRisk ||
    [];

  const nestsAtRiskCount = Number(
    details.nestsAtRiskCount ?? nestsAtRisk.length ?? 0,
  );

  const summary =
    details.summary || "Shoreline risk detected in the monitored coastal zone.";

  const riskReason =
    details.riskReason ||
    "Shoreline movement has increased the risk exposure of the nesting area.";

  const recommendedAction =
    details.recommendedAction ||
    "Please review the shoreline condition and verify affected nests on site.";

  return {
    details,
    evaluation,
    environment,
    boundaryCrossed,
    nestsAtRisk,
    nestsAtRiskCount,
    summary,
    riskReason,
    recommendedAction,
  };
}

function buildNestRows(nestsAtRisk) {
  if (!Array.isArray(nestsAtRisk) || nestsAtRisk.length === 0) {
    return `
      <tr>
        <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
          No specific nests listed
        </td>
      </tr>
    `;
  }

  return nestsAtRisk
    .slice(0, 10)
    .map((n, index) => {
      const nestLabel = escapeHtml(n.label || n.id || `Nest ${index + 1}`);
      const distance =
        n.distancePct != null && Number.isFinite(Number(n.distancePct))
          ? `${Number(n.distancePct).toFixed(2)}%`
          : "N/A";
      const threatLevel = escapeHtml(n.threatLevel || "unknown");

      return `
        <tr>
          <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#0f172a; font-weight:600;">
            ${nestLabel}
          </td>
          <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
            ${distance}
          </td>
          <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569; text-transform:capitalize;">
            ${threatLevel}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildEmailHtml(alertDoc) {
  const createdAt = new Date(alertDoc?.createdAt || Date.now()).toLocaleString(
    "en-LK",
    {
      timeZone: "Asia/Colombo",
    },
  );

  const riskLevel = String(alertDoc?.riskLevel || "low").toLowerCase();
  const riskLabel = formatRiskLabel(riskLevel);
  const colors = riskColors(riskLevel);

  const {
    environment,
    boundaryCrossed,
    nestsAtRisk,
    nestsAtRiskCount,
    summary,
    riskReason,
    recommendedAction,
  } = getAlertDetails(alertDoc);

  const rainLast3h = environment?.rain?.last3h_mm ?? "N/A";
  const rainNext6h = environment?.rain?.next6h_mm ?? "N/A";
  const tideHeight = environment?.tide?.height_m ?? "N/A";
  const tideTrend = environment?.tide?.trend ?? "unknown";
  const envSource =
    environment?.source || alertDoc?.details?.environment?.source || "unknown";

  return `
  <div style="margin:0; padding:24px; background:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="max-width:760px; margin:0 auto; background:#ffffff; border:1px solid ${colors.border}; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      
      <div style="padding:20px 24px; background:${colors.soft}; border-bottom:1px solid ${colors.border};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${colors.primary};">
              TurtleGuard Shoreline Monitoring
            </div>
            <h2 style="margin:8px 0 0; font-size:28px; line-height:1.2; color:${colors.primary};">
              ${escapeHtml(riskLabel)}
            </h2>
          </div>

          <div style="padding:8px 14px; border-radius:999px; background:${colors.badgeBg}; color:${colors.badgeText}; font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">
            ${escapeHtml(riskLabel)}
          </div>
        </div>

        <p style="margin:16px 0 0; font-size:18px; font-weight:700; color:#111827;">
          ${escapeHtml(alertDoc?.message || "Shoreline alert")}
        </p>
        <p style="margin:8px 0 0; font-size:14px; line-height:1.7; color:#475569;">
          ${escapeHtml(summary)}
        </p>
      </div>

      <div style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:20px;">
          <tr>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; width:34%; background:#f8fafc; font-weight:700; color:#334155;">
              Alert time
            </td>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; color:#475569;">
              ${escapeHtml(createdAt)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
              Boundary status
            </td>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; color:#475569;">
              ${boundaryCrossed ? "Crossed" : "Clear"}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
              Nests at risk
            </td>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; color:#475569;">
              ${escapeHtml(nestsAtRiskCount)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
              Risk reason
            </td>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; color:#475569; line-height:1.7;">
              ${escapeHtml(riskReason)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
              Recommended action
            </td>
            <td style="padding:12px 14px; border:1px solid #e5e7eb; color:#475569; line-height:1.7;">
              ${escapeHtml(recommendedAction)}
            </td>
          </tr>
        </table>

        <div style="margin-top:22px;">
          <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">Affected nests</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; font-size:14px;">
            <thead>
              <tr>
                <th align="left" style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; color:#334155;">Nest</th>
                <th align="left" style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; color:#334155;">Distance</th>
                <th align="left" style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; color:#334155;">Threat level</th>
              </tr>
            </thead>
            <tbody>
              ${buildNestRows(nestsAtRisk)}
            </tbody>
          </table>
        </div>

        <div style="margin-top:22px;">
          <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">Environmental context</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; width:34%; background:#f8fafc; font-weight:700; color:#334155;">
                Rain (last 3h)
              </td>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
                ${escapeHtml(rainLast3h)} mm
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
                Rain (next 6h)
              </td>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
                ${escapeHtml(rainNext6h)} mm
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
                Tide height
              </td>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
                ${escapeHtml(tideHeight)} m
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
                Tide trend
              </td>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
                ${escapeHtml(tideTrend)}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; background:#f8fafc; font-weight:700; color:#334155;">
                Environment source
              </td>
              <td style="padding:10px 12px; border:1px solid #e5e7eb; color:#475569;">
                ${escapeHtml(envSource)}
              </td>
            </tr>
          </table>
        </div>

        <p style="margin:24px 0 0; font-size:12px; color:#64748b; line-height:1.6;">
          Automated alert from TurtleGuard Shoreline Monitoring. Please review this event promptly and document any field action taken.
        </p>
      </div>
    </div>
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

  const subject = `[${formatRiskLabel(alertDoc?.riskLevel)}] ${alertDoc?.message || "Shoreline Alert"}`;

  await transporter.sendMail({
    from: getFromAddress(),
    to: to.join(","),
    subject,
    html: buildEmailHtml(alertDoc),
  });

  return { sent: true, to };
}

export async function notifyIfAllowed({ alertDoc, recipients } = {}) {
  const ok = await canSendByCooldown(alertDoc?.cooldownKey);
  if (!ok) return { sent: false, reason: "cooldown" };

  return await sendShorelineAlertEmail(alertDoc, { recipients });
}
