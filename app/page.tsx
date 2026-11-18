import Link from "next/link";
import { EmailStart } from "@/components/EmailStart";
import { Landing } from "@/components/Landing";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { error, deleted } = await searchParams;
  return (
    <>
      {deleted && <p role="status" className="mx-auto max-w-2xl px-4 pt-6"><span className="card block p-3">Your data has been deleted.</span></p>}
      <Landing
        form={<EmailStart siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} initialError={error?.slice(0, 200) ?? ""} />}
        footer={<Link href="/account" className="underline">Already have a plan?</Link>}
      />
    </>
  );
}
