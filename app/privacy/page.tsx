import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4 leading-relaxed">
      <h1 className="text-2xl font-bold">Privacy policy</h1>
      <p className="text-sm text-muted">Template — have counsel review before launch.</p>
      <h2 className="text-lg font-semibold">What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Your email address, if you choose to give it, and when you consented and confirmed it.</li>
        <li>Clicks on Buy links (which item), so we know which recommendations help.</li>
        <li>Your questionnaire answers: ZIP code, household size and ages, pets, home features, and yes/no answers about prescriptions and powered medical devices. We never ask for diagnoses, street addresses or ID numbers.</li>
        <li>If you answer yes to the prescription, powered medical device or mobility questions, we ask for your consent first. Those answers are used only to build your plan. They are encrypted and never sold, shared for advertising or used to choose marketing emails.</li>
        <li>Email delivery events (sent, opened, bounced) so we can measure whether plans arrive.</li>
      </ul>
      <h2 className="text-lg font-semibold">How we protect it</h2>
      <p>Answers and plans are encrypted in our database with AES-256-GCM, on top of our provider&apos;s encryption at rest. Answers never appear in web addresses. Only our servers can read the database.</p>
      <h2 className="text-lg font-semibold">How we use it</h2>
      <p>Email is optional. If you give it, we use it to send your plan, and — only if you ticked the reminders box and confirmed your email — occasional seasonal reminders. We don&apos;t sell your data. When an AI model helps word your plan, it receives your household details (not your email) and is never allowed to set quantities.</p>
      <h2 className="text-lg font-semibold">Your choices</h2>
      <p>Unsubscribe from any email in one click. Sign in at <a href="/account" className="underline">My plan</a> to export your data as JSON or delete it permanently (GDPR/CCPA).</p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Write to the mailing address in the footer of any {BRAND.name} email.</p>
    </div>
  );
}
