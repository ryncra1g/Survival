import { atLeast } from "@/lib/zip/profile";
import type { ComputedPlan } from "@/lib/rules/engine";

/**
 * D12 / MT-01: the maintenance schedule as data. One source for the plan's table, the calendar file
 * (.ics), the printable list, Copy for your AI assistant and (accounts track) email reminders.
 * The wording and intervals are the plan's existing maintenance table, unchanged.
 */
export type Repeat = { every: "month" | "6 months" | "12 months" } | { month: number };
export interface MaintenanceItem {
  id: string;
  /** The "When" column, exactly as the plan shows it. */
  when: string;
  task: string;
  repeat: Repeat;
}

export function maintenanceItems(cp: Pick<ComputedPlan, "answers" | "power" | "flags" | "profile">): MaintenanceItem[] {
  const a = cp.answers;
  const prof = cp.profile;
  const hasGen = cp.power.generatorStatus === "owned_portable" || cp.power.generatorStatus === "recommended";
  const items: (MaintenanceItem | false)[] = [
    { id: "alarms", when: "Monthly", task: "Test CO and smoke alarms.", repeat: { every: "month" } },
    hasGen && { id: "generator", when: "Monthly", task: "Run the generator under load outdoors for 20 minutes.", repeat: { every: "month" } },
    { id: "rotate", when: "Every 6 months", task: "Replace tap-filled stored water; check food dates and rotate into meals; refresh go-bags for the season.", repeat: { every: "6 months" } },
    { id: "yearly", when: "Every 12 months", task: "Rotate stabilized gasoline into cars; replace bleach; check first aid kit; update documents, photos and medication lists.", repeat: { every: "12 months" } },
    a.heatSources.includes("wood") && { id: "chimney", when: "Every fall", task: "Chimney inspection and sweeping.", repeat: { month: 10 } },
    cp.flags.winter && { id: "winter", when: "November", task: "Winter check: heat plan, pipe insulation, sleeping bags, propane.", repeat: { month: 11 } },
    atLeast(prof.hurricane, "moderate") && { id: "hurricane", when: "June", task: "Hurricane season check: window protection, evacuation zone, insurance, fuel.", repeat: { month: 6 } },
    atLeast(prof.wildfire, "moderate") && { id: "wildfire", when: "Spring", task: "Wildfire check: clear 5 ft around the house, N95 masks, go-bags.", repeat: { month: 4 } },
    { id: "review", when: "Every 12 months", task: "Review this plan and regenerate it if your household changes.", repeat: { every: "12 months" } },
  ];
  return items.filter((i): i is MaintenanceItem => !!i);
}
