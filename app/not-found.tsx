import Link from "next/link";

/**
 * DA-2: the most likely reason someone lands here is an old plan link opened in another browser, or after 30 days.
 * Say so plainly, give a way forward for a visitor (build a new plan) and for someone with a confirmed email (sign in).
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-4">
      <h1 className="text-2xl font-bold">We can&apos;t find that page</h1>
      <p>If you were looking for a plan, it may have been built in a different browser. Without a confirmed email, a plan opens only in the browser that built it, for 30 days.</p>
      <div className="flex flex-col gap-3 pt-1">
        <Link href="/start" className="btn">Build a new plan</Link>
        <Link href="/account" className="btn-ghost">I confirmed my email: sign in</Link>
      </div>
      <p className="text-sm text-muted">A new plan takes about 5 minutes. <Link href="/" className="tap-inline underline">Go to the front page</Link></p>
    </div>
  );
}
