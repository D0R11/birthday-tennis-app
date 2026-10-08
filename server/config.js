// Environment for the server and scripts. Locally the values come from .env; on Railway they're
// service variables, so a missing .env is fine.
try { process.loadEnvFile(); } catch { /* no .env file */ }

const env = process.env;
const isProduction = env.NODE_ENV === 'production' || !!env.RAILWAY_ENVIRONMENT;

export const config = {
  isProduction,
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL || null,
  publicUrl: (env.PUBLIC_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
  // Resend's web API (HTTPS), used when there's a key: RESEND_API_KEY, or the Resend SMTP password.
  // Preferred over SMTP because some hosts (Railway's free plans) block outbound SMTP.
  resendApiKey: env.RESEND_API_KEY || (env.SMTP_HOST === 'smtp.resend.com' ? env.SMTP_PASS : null) || null,
  // Any SMTP email service (Resend: smtp.resend.com, port 465, user "resend", password = API key).
  smtp: env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? { host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 465, user: env.SMTP_USER, pass: env.SMTP_PASS }
    : null,
  mailFrom: env.MAIL_FROM || null,
  adminToken: env.ADMIN_TOKEN || null,
  // Dev only: pretend today is this date (YYYY-MM-DD, Manila time) to test the deadline states.
  todayOverride: isProduction ? null : env.TODAY_OVERRIDE || null,
};
