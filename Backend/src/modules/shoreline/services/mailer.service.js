import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
  process.env;

let cached = null;

export function getTransporter() {
  if (cached) return cached;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP not configured (missing SMTP_HOST/USER/PASS)");
    return null;
  }

  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE || "false") === "true", // false for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return cached;
}

export function getFromAddress() {
  return SMTP_FROM || SMTP_USER;
}
