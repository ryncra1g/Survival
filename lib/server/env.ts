import "server-only";

/** Central env access. Demo mode = no Supabase configured: file-backed store, console email. */
export const env = {
  appUrl: process.env.APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  resendKey: process.env.RESEND_API_KEY || "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || "",
  emailFrom: process.env.EMAIL_FROM || "Kinready <plans@example.com>",
  mailingAddress: process.env.MAILING_ADDRESS || "Kinready · [Set MAILING_ADDRESS] · City, ST 00000",
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  encryptionKey: process.env.APP_ENCRYPTION_KEY || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  adminEmails: (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  cronSecret: process.env.CRON_SECRET || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
};

export const isDemo = !env.supabaseUrl || !env.supabaseServiceKey;
export const isProd = process.env.NODE_ENV === "production";

const DEV_KEY = "readyplan-dev-only-insecure-key-do-not-use-in-prod";
export function secret(name: "encryption" | "session"): string {
  const v = name === "encryption" ? env.encryptionKey : env.sessionSecret;
  if (v) return v;
  if (isProd && !isDemo) throw new Error(`Missing ${name === "encryption" ? "APP_ENCRYPTION_KEY" : "SESSION_SECRET"}`);
  return `${DEV_KEY}:${name}`;
}
