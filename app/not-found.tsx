import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-3">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted">This page doesn&apos;t exist, or you need to sign in to see it.</p>
      <Link href="/account" className="btn">Sign in</Link>
    </div>
  );
}
