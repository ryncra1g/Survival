import "server-only";
import { headers } from "next/headers";
import { store } from "./store";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

export const LIMITS = {
  signupPerIpHour: 8,
  startPerIpHour: 30,
  loginPerEmailHour: 5,
  generatePerUserDay: 8,
  generatePerIpHour: 20,
  saveAnswersPerIpMinute: 120,
};

export async function limit(key: string, max: number, windowSec: number): Promise<boolean> {
  return store.rateLimit(key, max, windowSec);
}
