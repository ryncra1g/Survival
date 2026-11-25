/**
 * User-facing wording about where a plan is saved (owner brief D2 correction).
 * Without an account a plan is stored with the plan on the server and opens only in this browser, for 30 days.
 * There is no shareable link. tests/copy.test.ts keeps every other string consistent with this.
 */
export const SAVED_ON_DEVICE = "Saved on this device for 30 days. Confirm your email to keep it and use it on any device.";
export const SAVED_ON_DEVICE_ACCOUNTS =
  "Your plan and inventory are saved on this device for 30 days. Confirm your email to keep them and use them on any device.";
/**
 * D4 / UX-1: the places page never saves the address. With accounts off (launch) there is nowhere to save it,
 * so the note only says how to keep it. "Confirm your email to save your places" appears only when accounts are on.
 */
export const PLACES_NOT_SAVED = "This isn't saved. Print this page or write it down.";
export const PLACES_NOT_SAVED_ACCOUNTS = "This isn't saved. Print this page or write it down, or confirm your email to save your places and use them on any device.";
export const placesNote = (accounts: boolean) => (accounts ? PLACES_NOT_SAVED_ACCOUNTS : PLACES_NOT_SAVED);

export const saveBarText = (accounts: boolean) => (accounts ? SAVED_ON_DEVICE_ACCOUNTS : SAVED_ON_DEVICE);
