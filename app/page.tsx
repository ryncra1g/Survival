import Link from "next/link";
import { Landing } from "@/components/Landing";
import { StartButton } from "@/components/StartButton";

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <>
      {deleted && <p role="status" className="mx-auto max-w-2xl px-4 pt-6"><span className="card block p-3">Your data has been deleted.</span></p>}
      <Landing
        cta={<StartButton />}
        footer={<><Link href="/sample" className="underline">See a sample plan</Link> · <Link href="/account" className="underline">Already have a plan?</Link></>}
      />
    </>
  );
}
