import type { Metadata } from "next";
import { StartButton } from "@/components/StartButton";

export const metadata: Metadata = { title: "Start your plan" };

export default function Start() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-4">
      <h1 className="text-2xl font-bold">Let&apos;s build your plan</h1>
      <p className="text-muted">About 5 minutes. No sign-up. Your answers are saved in this browser as you go.</p>
      <StartButton label="Start" />
    </div>
  );
}
