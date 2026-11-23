import { z } from "zod";

/**
 * Accounts track (Batch D, behind ACCOUNTS_ENABLED): the data a household keeps coming back to.
 * - Inventory (D2): per plan, have / need / bought / low, quantity, optional expiry. Stored encrypted.
 * - My places (D4): per account, name + address of backup destinations. Stored encrypted; never used in
 *   emails, analytics or AI.
 * - Reminder preferences (D12): opt-in email reminders per maintenance item, separate from marketing.
 */
export const INVENTORY_STATUS = ["have", "need", "bought", "low"] as const;
export const InventoryEntrySchema = z.object({
  status: z.enum(INVENTORY_STATUS),
  qty: z.number().int().min(0).max(100_000).optional(),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export const InventorySchema = z
  .record(z.string().regex(/^[a-z0-9-]{1,40}$/), InventoryEntrySchema)
  .refine((o) => Object.keys(o).length <= 300, "Too many items");
export type InventoryEntry = z.infer<typeof InventoryEntrySchema>;
export type Inventory = z.infer<typeof InventorySchema>;

/** Have it already, or bought it: the plan stops suggesting it and its Buy buttons disappear. */
export const owned = (inv: Inventory | null | undefined, itemId: string) => {
  const s = inv?.[itemId]?.status;
  return s === "have" || s === "bought";
};

/** The "I have this" ticks from before inventory existed (got-<itemId>) become "have", once. */
export function seedInventory(inv: Inventory | null | undefined, checks: Record<string, boolean> | undefined): Inventory {
  const out: Inventory = { ...(inv ?? {}) };
  for (const [k, v] of Object.entries(checks ?? {})) {
    const id = k.startsWith("got-") ? k.slice(4) : null;
    if (v && id && /^[a-z0-9-]{1,40}$/.test(id) && !out[id]) out[id] = { status: "have" };
  }
  return out;
}

export const PlaceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(200).optional(),
  /** The person's own estimate; it can update the evacuation distance (no geocoding, no map service). */
  distanceMiles: z.number().int().min(1).max(2000).optional(),
});
export const PlacesSchema = z.array(PlaceSchema).max(10);
export type Place = z.infer<typeof PlaceSchema>;

export const REMINDER_EVERY = ["as_scheduled", "monthly", "quarterly"] as const;
export const ReminderPrefsSchema = z.object({
  enabled: z.boolean(),
  /** Per maintenance item id (lib/plan/maintenance.ts): on/off and how often. */
  types: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.object({ on: z.boolean(), every: z.enum(REMINDER_EVERY) })).refine((o) => Object.keys(o).length <= 30),
});
export type ReminderPrefs = z.infer<typeof ReminderPrefsSchema>;
export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: false, types: {} };
