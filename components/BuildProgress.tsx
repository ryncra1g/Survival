"use client";
import { BUILD_STAGES, type BuildStage } from "@/lib/plan/stages";

/**
 * D11: a calm card with the three real stages, ticked as each one actually finishes.
 * No percentage. Under reduced motion the active marker doesn't animate. The live region announces each stage.
 */
export function BuildProgress({ done }: { done: BuildStage[] }) {
  const current = BUILD_STAGES.find((s) => !done.includes(s.id));
  const announce = current ? `${current.label}…` : "Your plan is ready.";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6" data-testid="build-progress">
        <h1 className="text-xl font-bold">Building your plan</h1>
        <ol className="mt-5 space-y-4">
          {BUILD_STAGES.map((s) => {
            const isDone = done.includes(s.id);
            const isCurrent = current?.id === s.id;
            return (
              <li key={s.id} className="flex items-start gap-3" data-stage={s.id} data-done={isDone || undefined}>
                <span aria-hidden="true" className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-ok bg-ok text-surface" : isCurrent ? "border-accent" : "border-line"}`}>
                  {isDone ? (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  ) : isCurrent ? (
                    <span className="size-2 rounded-full bg-accent animate-pulse motion-reduce:animate-none" />
                  ) : null}
                </span>
                <span className={isDone || isCurrent ? "text-ink" : "text-muted"}>
                  {s.label}
                  <span className="sr-only">{isDone ? " (done)" : isCurrent ? " (in progress)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      </div>
    </div>
  );
}
