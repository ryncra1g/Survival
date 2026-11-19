import type { Metadata } from "next";
import Link from "next/link";
import { TERMS_VERSION } from "@/lib/legal";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms of use" };

/** Template terms. Have a lawyer review before launch (see docs/LAUNCH_PLAN.md). */
export default function Terms() {
  const owner = process.env.NEXT_PUBLIC_LEGAL_NAME || `the operator of ${BRAND.name}`;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4 leading-relaxed">
      <h1 className="text-2xl font-bold">Terms of use</h1>
      <p className="text-sm text-muted">Version {TERMS_VERSION}</p>
      <p>{BRAND.name} is provided by {owner}. By using it, and by ticking the box before your plan is built, you agree to these terms. We keep a record of the version you agreed to and when.</p>
      <h2 className="text-lg font-semibold">General guidance only</h2>
      <p>{BRAND.name} gives general emergency-preparedness information. It is not professional, medical, legal, electrical or safety-engineering advice, and it doesn&apos;t replace instructions from emergency officials, your doctor, pharmacist, vet, utility or a licensed electrician. Quantities are planning estimates. Always follow product manuals and local codes, and never run fuel-burning equipment indoors.</p>
      <h2 className="text-lg font-semibold">No warranty; limit of liability</h2>
      <p>{BRAND.name} is provided &quot;as is&quot; without warranties of any kind. To the fullest extent the law allows, {owner} isn&apos;t liable for any loss, injury or damage arising from use of the plan, the products it mentions, or reliance on its content. You&apos;re responsible for how you use the information.</p>
      <h2 className="text-lg font-semibold">Products and affiliate links</h2>
      <p>Product examples and price ranges are general estimates and change often. Some Buy links are affiliate links: we may earn a commission at no extra cost to you. We don&apos;t sell products ourselves; purchases are between you and the store, under the store&apos;s terms.</p>
      <h2 className="text-lg font-semibold">Your data</h2>
      <p>See the <Link href="/privacy" className="underline">privacy policy</Link>. You can export or delete your data any time from <Link href="/account" className="underline">My plan</Link>.</p>
      <h2 className="text-lg font-semibold">Changes</h2>
      <p>We may update these terms; the current version is always on this page.</p>
    </div>
  );
}
