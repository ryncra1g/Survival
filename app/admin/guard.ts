import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/http";

export async function adminOrNotFound() {
  const admin = await requireAdmin();
  if (!admin) notFound();
  return admin;
}
