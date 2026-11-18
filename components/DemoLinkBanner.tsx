"use client";
import { useEffect, useState } from "react";

/** Demo mode only (no email provider): shows the confirmation link that would have been emailed. */
export function DemoLinkBanner() {
  const [link, setLink] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    try {
      setLink(sessionStorage.getItem("rp_demo_link"));
      setReturning(sessionStorage.getItem("rp_returning") === "1");
    } catch {}
  }, []);
  return (
    <>
      {returning && (
        <p className="mt-3 text-sm card p-3 no-print" role="status">
          Welcome back. We&apos;ve emailed you a sign-in link to see your earlier plans.
        </p>
      )}
      {link && <DemoLink link={link} />}
    </>
  );
}

function DemoLink({ link }: { link: string }) {
  return (
    <p className="mt-3 text-sm card p-3 no-print">
      Demo mode (no email provider): <a className="underline break-all" href={link}>open the confirmation email link</a>
    </p>
  );
}
