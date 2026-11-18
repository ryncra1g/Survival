import Link from "next/link";

export default async function Unsubscribed({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-3">
      <h1 className="text-2xl font-bold">{error ? "That link didn't work" : "You're unsubscribed"}</h1>
      <p className="text-muted">{error ? "The unsubscribe link was invalid. Sign in to change your email preferences." : "You won't get reminder or update emails. Sign-in links you request will still arrive."}</p>
      <Link href="/account" className="btn-ghost">Manage preferences</Link>
    </div>
  );
}
