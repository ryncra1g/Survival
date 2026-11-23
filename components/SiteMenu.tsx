"use client";
import { useEffect, useRef, useState } from "react";
import { menuItems, type MenuState } from "@/lib/menu";

/**
 * Top-right menu (D9). A <details> element, so it opens without JavaScript (visitor items).
 * With JavaScript it asks /api/auth/me once whether this browser is signed in.
 */
export function SiteMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const [state, setState] = useState<MenuState>({ signedIn: false, accounts: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setState({ signedIn: !!d.signedIn, accounts: !!d.accounts }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => {
      if (ref.current) ref.current.open = false;
      if (focus) ref.current?.querySelector("summary")?.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <details ref={ref} className="relative" data-testid="site-menu" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary aria-expanded={open} aria-haspopup="menu" className="list-none cursor-pointer min-h-11 min-w-11 inline-flex items-center justify-center gap-2 rounded-lg px-3 hover:bg-line/40 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="text-sm">{state.signedIn ? "Account" : "Menu"}</span>
      </summary>
      <nav aria-label="Site menu" className="absolute right-0 top-full mt-1 z-50 w-60 card p-1 shadow-lg">
        <ul>
          {menuItems(state).map((item) => (
            <li key={item.label}>
              {"href" in item ? (
                <a href={item.href} className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-line/40">{item.label}</a>
              ) : (
                <button type="button" onClick={signOut} className="flex w-full min-h-11 items-center rounded-md px-3 text-sm text-left hover:bg-line/40">{item.label}</button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
