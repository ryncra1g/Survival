/**
 * User-facing wording about where a plan is saved (owner brief D2 correction).
 * Without an account a plan is stored with the plan on the server and opens only in this browser, for 30 days.
 * There is no shareable link. tests/copy.test.ts keeps every other string consistent with this.
 */
export const SAVED_ON_DEVICE = "Saved on this device for 30 days. Confirm your email to keep it and use it on any device.";
export const SAVED_ON_DEVICE_ACCOUNTS =
  "Your plan and inventory are saved on this device for 30 days. Confirm your email to keep them and use them on any device.";
/** D4 at launch: the address is never saved anywhere, so this is the one place that says "isn't saved". */
export const PLACES_NOT_SAVED = "This address isn't saved. Confirm your email to save your places and use them on any device.";

export const saveBarText = (accounts: boolean) => (accounts ? SAVED_ON_DEVICE_ACCOUNTS : SAVED_ON_DEVICE);
