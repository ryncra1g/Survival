/**
 * Visual calm pass (item 6): one consistent set of simple line icons (24px grid, 1.75 stroke, round caps), drawn in
 * the brand blue via currentColor. Decorative: always next to a text label, so hidden from screen readers.
 */
import { ICON_PATHS, type IconName } from "@/lib/icons";
export { CHAPTER_ICON, SECTION_ICON, type IconName } from "@/lib/icons";

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" data-icon={name}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
