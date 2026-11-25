import type { LevelOption } from "@/lib/plan/document";

const LABEL = { mix: "Recommended mix", essential: "Essential", standard: "Standard", premium: "Premium" } as const;

/**
 * À la carte level picker for one gear slot. Each level is a plain form POST to
 * /api/plans/<id>/choose (works without JavaScript); the demo passes `onChoose` instead.
 */
export function LevelChips({
  planId,
  group,
  levels,
  back,
  onChoose,
}: {
  planId: string;
  group: string;
  levels: LevelOption[];
  back: string;
  onChoose?: (group: string, level: LevelOption["level"]) => void;
}) {
  return (
    <div className="mt-2" role="group" aria-label="Choose a level">
      <div className="flex flex-wrap gap-1.5">
        {levels.map((l) => {
          const cls = `rounded-lg border px-2.5 py-1.5 text-left text-xs leading-tight min-h-[44px] ${l.selected ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface"}`;
          const inner = (
            <>
              <span className="block">{l.selected ? "✓ " : ""}{LABEL[l.level]}</span>
              <span className="block text-muted font-normal">{l.price}</span>
            </>
          );
          if (l.selected)
            return (
              <span key={l.level} className={cls} aria-current="true" title={l.name}>
                {inner}
              </span>
            );
          if (onChoose)
            return (
              <button key={l.level} type="button" className={cls} title={l.name} onClick={() => onChoose(group, l.level)}>
                {inner}
              </button>
            );
          return (
            <form key={l.level} action={`/api/plans/${planId}/choose`} method="post">
              <input type="hidden" name="group" value={group} />
              <input type="hidden" name="level" value={l.level} />
              <input type="hidden" name="back" value={back} />
              <button className={cls} title={l.name} aria-label={`Switch to ${LABEL[l.level]}: ${l.name}, ${l.price}`}>
                {inner}
              </button>
            </form>
          );
        })}
      </div>
      {levels.find((l) => l.selected) && <p className="text-xs text-muted mt-1">{levels.find((l) => l.selected)!.name}</p>}
    </div>
  );
}
