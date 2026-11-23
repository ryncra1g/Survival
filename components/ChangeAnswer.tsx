import { Chevron } from "./Chevron";

/** Row of "change one answer" links on the plan page. Plain form posts. */
const LINKS: [string, string][] = [
  ["location", "Location & length"],
  ["household", "Household"],
  ["pets", "Pets"],
  ["medical", "Medical"],
  ["home", "Home"],
  ["heat", "Heat, cooking & water"],
  ["power", "Power & vehicles"],
  ["storage", "Storage & evacuation"],
  ["budget", "Budget"],
];

export function ChangeAnswer({ planId }: { planId: string }) {
  return (
    <details className="group card mt-3 no-print">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold [&::-webkit-details-marker]:hidden">
        Something not right? Change an answer
        <Chevron />
      </summary>
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {LINKS.map(([screen, label]) => (
          <form key={screen} action={`/api/plans/${planId}/edit`} method="post">
            <input type="hidden" name="screen" value={screen} />
            <button className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm">{label}</button>
          </form>
        ))}
      </div>
    </details>
  );
}
