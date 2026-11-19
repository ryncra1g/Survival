"use client";
import { useEffect, useState } from "react";

type NavChapter = { id: string; title: string; short: string; sections: { id: string; title: string }[] };

const openSection = (id: string) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
  return el;
};

/**
 * Sticky plan navigation: 4 chapter tabs (short labels on phones), chips for the active chapter's
 * sections, then Expand/Collapse all. An IntersectionObserver highlights the chapter being read.
 * Also opens a collapsed section for #section links and opens everything before printing.
 */
export function SectionNav({ chapters }: { chapters: NavChapter[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");

  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      const el = openSection(id);
      const ch = chapters.find((c) => c.sections.some((s) => s.id === id) || `ch-${c.id}` === id);
      if (ch) setActive(ch.id);
      el?.scrollIntoView();
    };
    const all = () => document.querySelectorAll<HTMLDetailsElement>("details[data-section]").forEach((d) => (d.open = true));
    go();
    window.addEventListener("hashchange", go);
    window.addEventListener("beforeprint", all);

    // Highlight the chapter whose top is nearest the top of the screen.
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.chapter!;
          if (e.isIntersecting) visible.set(id, e.boundingClientRect.top);
          else visible.delete(id);
        }
        const order = chapters.map((c) => c.id).filter((id) => visible.has(id));
        if (order.length) setActive(order[0]);
      },
      { rootMargin: "-70px 0px -55% 0px" },
    );
    document.querySelectorAll<HTMLElement>("section[data-chapter]").forEach((el) => io.observe(el));
    return () => {
      window.removeEventListener("hashchange", go);
      window.removeEventListener("beforeprint", all);
      io.disconnect();
    };
  }, [chapters]);

  const setAll = (open: boolean) => document.querySelectorAll<HTMLDetailsElement>("details[data-section]").forEach((d) => (d.open = open));
  const current = chapters.find((c) => c.id === active) ?? chapters[0];
  return (
    <>
    {/* Only the four tabs stay pinned (about 56px), so most of the phone screen is the plan itself.
        Section chips sit under each chapter heading instead. */}
    <nav aria-label="Plan sections" className="no-print sticky top-0 z-10 -mx-4 px-4 py-2 bg-bg/95 backdrop-blur border-b border-line mt-6">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface border border-line p-1">
        {chapters.map((c) => (
          <a
            key={c.id}
            href={`#ch-${c.id}`}
            aria-current={c.id === current?.id ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              setActive(c.id);
              document.getElementById(`ch-${c.id}`)?.scrollIntoView({ behavior: "smooth" });
              history.replaceState(null, "", `#ch-${c.id}`);
            }}
            className={`rounded-lg px-1 py-2 text-center text-sm font-semibold leading-tight ${c.id === current?.id ? "bg-brand text-brand-ink" : "text-ink"}`}
          >
            <span className="sm:hidden">{c.short}</span>
            <span className="hidden sm:inline">{c.title}</span>
          </a>
        ))}
      </div>
    </nav>
    <div className="no-print mt-2 flex justify-end gap-4 text-sm">
      <button type="button" className="underline min-h-[32px]" onClick={() => setAll(true)}>Expand all</button>
      <button type="button" className="underline min-h-[32px]" onClick={() => setAll(false)}>Collapse all</button>
    </div>
    </>
  );
}
