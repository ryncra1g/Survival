import type { Metadata } from "next";
import { AccountActions } from "./parts";

export const metadata: Metadata = { title: "My plan", robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <AccountActions searchParams={await searchParams} />;
}
