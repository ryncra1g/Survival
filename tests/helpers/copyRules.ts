/**
 * docs/DESIGN.md copy rules, shared by tests/design.test.ts (the app's copy and plans) and tests/offsite.test.ts
 * (PDFs and emails). C1 urgency and fear, C2 exclamation marks, T9 "exact", T8 blame.
 */
export const URGENCY = [
  /\bact now\b/i,
  /\bdon'?t wait\b/i,
  /\bhurry\b/i,
  /\bbefore it'?s too late\b/i,
  /\bdisaster (could|can|will|may) strike\b/i,
  /\bwhen disaster strikes\b/i,
  /\bcount ?down\b/i,
  /\blimited time\b/i,
  /\bonly \d+ left\b/i,
  /\bpanic\b/i,
  /\bterrif(y|ying|ied)\b/i,
  /\bscary\b/i,
  /\bdoomsday\b/i,
  /\bapocalyp/i,
  /\burgent(ly)?\b/i,
  /\bimmediately\b/i,
  /\bdon'?t miss\b/i,
  /\bwhat are you waiting for\b/i,
];
/** C2: an exclamation mark ending a word ("Done!"), not code ("!important", "!=", "<!doctype"). */
export const EXCLAIM = /[\p{L}\p{N})"'’]!(?=\s|$|["'’)<])/u;
/** T9: no precision claims about planning estimates. */
export const EXACT = /\bexact(ly)?\b/i;
/** T8: errors never blame. */
export const BLAME = /\b(invalid|failed|wrong|illegal|not allowed|you must)\b/i;
