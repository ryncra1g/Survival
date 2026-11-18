"use client";
import { useEffect, useState } from "react";

/** Demo mode only (no email provider): shows the confirmation link that would have been emailed. */
export function DemoLinkBanner() {
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    try {
      setLink(sessionStorage.getItem("rp_demo_link"));
    } catch {}
  }, []);
  if (!link) return null;
  return (
    <p className="mt-3 text-sm card p-3 no-print">
      Demo mode (no email provider): <a className="underline break-all" href={link}>open the confirmation email link</a>
    </p>
  );
}
