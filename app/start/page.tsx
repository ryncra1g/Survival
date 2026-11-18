import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = { title: "Start your plan" };

export default function Start() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Let&apos;s build your plan</h1>
      <p className="mt-2 text-muted">About 11 quick screens. Your answers save as you go.</p>
      <div className="mt-6">
        <SignupForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
      </div>
    </div>
  );
}
