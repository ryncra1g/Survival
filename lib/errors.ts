/**
 * DESIGN.md T8 / E8 (design audit DA-4): an error says what happened and what to do next, in plain words, and never
 * blames the person. Server routes send these sentences; clients pass every failure through `friendlyError`, so a
 * raw "Not found", "Bad origin" or the browser's "Failed to fetch" never reaches the screen.
 */
export const ERR = {
  build: "We couldn't build your plan just now. Your answers are saved. Try again in a minute.",
  network: "We couldn't reach the server. Check your connection and try again. Nothing you entered is lost.",
  reload: "This page has been open a while. Reload it and try again.",
  gone: "We can't find this any more. It may have been started in another browser, or more than 30 days ago.",
  signedOut: "Your sign-in has ended. Sign in again from the menu, then try again.",
  save: "We couldn't save that just now. Check your connection and try again.",
  email: "Check the email address. It should look like name@example.com.",
  answers: "Some answers need another look. Go back through the questions; your answers are saved.",
  botCheck: "The security check didn't finish. Reload the page and try again.",
} as const;

/** A message for the screen from a failed request: the server's own sentence when it wrote one for people, else a plain fallback. */
export function friendlyError(status: number, serverMsg: string | undefined, fallback: string): string {
  if (status === 0) return ERR.network;
  if (status === 401) return ERR.signedOut;
  if (status === 403) return ERR.reload;
  if (status === 404) return ERR.gone;
  if (status >= 500) return fallback;
  // 400 / 429: routes write these for people (lib/errors.ts ERR or a full sentence). Anything terse falls back.
  return serverMsg && /\s/.test(serverMsg) && /[.?]$/.test(serverMsg) ? serverMsg : fallback;
}

/** fetch() rejects with a TypeError ("Failed to fetch") when offline: say so plainly. */
export function errorFromThrown(e: unknown, fallback: string): string {
  if (e instanceof TypeError) return ERR.network;
  const m = e instanceof Error ? e.message : "";
  return m && /\s/.test(m) && /[.?]$/.test(m) ? m : fallback;
}
