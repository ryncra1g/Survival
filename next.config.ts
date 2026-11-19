import type { NextConfig } from "next";
import { usingWorkingName, WORKING_NAME } from "./lib/brand";

// A production deploy must not ship under the working name (another app already uses it).
// Vercel sets VERCEL_ENV; on other hosts set DEPLOY_ENV=production. Local and preview builds are unaffected.
if (usingWorkingName && (process.env.VERCEL_ENV === "production" || process.env.DEPLOY_ENV === "production")) {
  throw new Error(`NEXT_PUBLIC_BRAND_NAME is unset or still "${WORKING_NAME}" (the working name). Set the final product name before a production deploy.`);
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
