"use client";
import { useEffect } from "react";

const openSection = (id: string) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
  return el;
};

/**
 * Sticky bar of section links. Opens a collapsed section before jumping to it, honours #section
 * links (e.g. from the "Shop" link in emails), opens everything before printing, and offers Expand/Collapse all.
 */
export function SectionNav({ sections }: { sections: { id: string; title: string }[] }) {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id) openSection(id)?.scrollIntoView();
    };
    const all = () => document.querySelectorAll<HTMLDetailsElement>("details[data-section]").forEach((d) => (d.open = true));
    go();
    window.addEventListener("hashchange", go);
    window.addEventListener("beforeprint", all);
    return () => {
      window.removeEventListener("hashchange", go);
      window.removeEventListener("beforeprint", all);
    };
  }, []);
  const setAll = (open: boolean) => document.querySelectorAll<HTMLDetailsElement>("details[data-section]").forEach((d) => (d.open = open));
  return (
    <nav aria-label="Plan sections" className="no-print sticky top-0 z-10 -mx-4 px-4 py-2 bg-bg/95 backdrop-blur border-b border-line mt-6">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              openSection(s.id)?.scrollIntoView({ behavior: "smooth" });
              history.replaceState(null, "", `#${s.id}`);
            }}
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm whitespace-nowrap"
          >
            {s.title}
          </a>
        ))}
      </div>
      <div className="flex gap-4 text-sm mt-1">
        <button type="button" className="underline" onClick={() => setAll(true)}>Expand all</button>
        <button type="button" className="underline" onClick={() => setAll(false)}>Collapse all</button>
      </div>
    </nav>
  );
}
