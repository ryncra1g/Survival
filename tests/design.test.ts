import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ERR, errorFromThrown, friendlyError } from "@/lib/errors";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { REASSURANCE } from "@/lib/plan/nextSteps";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan } from "./helpers/build";

/**
 * docs/DESIGN.md guardrails: the rules a machine can check. Read DESIGN.md before changing anything here; a
 * failure means a screen or plan broke the standard, not that the list needs a new exception.
 *
 * "Product copy" is every string literal, template literal and JSX text in the app (app/, components/, lib/,
 * demo/main.tsx), outside the admin pages and the safety linter's own pattern lists. Comments aren't copy.
 */
const ROOTS = ["app", "components", "lib", "demo/main.tsx"];
const NOT_COPY = [
  /^app[\\/](admin|api[\\/]admin)/,
  /^lib[\\/]safety[\\/]linter\.ts$/, // the unsafe phrasings it blocks
  /^lib[\\/]llm[\\/]/, // instructions to the wording model, never shown
  /^lib[\\/]server[\\/]store[\\/]/, // database code
  /[\\/]dist[\\/]/,
];
/** Product names people buy under that name (catalog example models). */
const untrademarked = (t: string) => t.replace(/QuakeHOLD!/g, "QuakeHOLD");

function files(p: string): string[] {
  if (statSync(p).isFile()) return /\.(ts|tsx)$/.test(p) ? [p] : [];
  return readdirSync(p).flatMap((n) => (n === "node_modules" ? [] : files(join(p, n))));
}
const SOURCES = ROOTS.flatMap(files).filter((f) => !NOT_COPY.some((re) => re.test(f)));

type Copy = { file: string; line: number; text: string };
/** Every piece of text a person could see: string literals, template text and JSX text. Imports and attributes that aren't text are skipped. */
function copyIn(file: string): Copy[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Copy[] = [];
  const NON_TEXT_ATTR = /^(className|href|src|id|htmlFor|data-[\w-]+|role|type|name|rel|target|method|action|inputMode|autoComplete|enterKeyHint|key|style|viewBox|d|fill|stroke\w*|aria-(describedby|labelledby|controls|current|hidden|live))$/;
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isJsxAttribute(n) && NON_TEXT_ATTR.test(n.name.getText(src))) return;
    if (ts.isPropertyAssignment(n) && /^(className|href|url|anchor|id|testid)$/.test(n.name.getText(src))) return;
    // Decision triggers ({ if, then }) are safety instructions: direct by design (DESIGN.md C1), like danger callouts.
    if (ts.isPropertyAssignment(n) && /^(if|then)$/.test(n.name.getText(src))) return;
    const push = (text: string) => text.trim() && out.push({ file, line: src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1, text: untrademarked(text) });
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) push(n.text);
    else if (ts.isTemplateExpression(n)) [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].forEach(push);
    else if (ts.isJsxText(n)) push(n.getText(src));
    ts.forEachChild(n, visit);
  };
  visit(src);
  return out;
}
const COPY = SOURCES.flatMap(copyIn);
const show = (hits: Copy[]) => hits.map((h) => `${h.file}:${h.line}  ${h.text.trim().slice(0, 120)}`);

/**
 * C1: fear and urgency. Safety instructions may be direct ("Leave by the route officials give"); they're in the plan's
 * danger callouts and decision triggers, which the plan check below skips, and they're never in UI copy.
 */
const URGENCY = [
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
const EXCLAIM = /[\p{L}\p{N})"'’]!(?=\s|$|["'’)<])/u;
/** T9: no precision claims about planning estimates. */
const EXACT = /\bexact(ly)?\b/i;
/** T8: errors never blame. */
const BLAME = /\b(invalid|failed|wrong|illegal|not allowed|you must)\b/i;

describe("DESIGN.md C1 / C2 / T9: product copy", () => {
  it("finds the app's copy", () => {
    expect(SOURCES.length).toBeGreaterThan(80);
    expect(COPY.length).toBeGreaterThan(1500);
    expect(COPY.some((c) => c.text.includes("Start with these"))).toBe(true);
  });
  it("C2: no exclamation marks", () => expect(show(COPY.filter((c) => EXCLAIM.test(c.text)))).toEqual([]));
  it("C1: no fear or urgency words", () => expect(show(COPY.filter((c) => URGENCY.some((re) => re.test(c.text))))).toEqual([]));
  it('T9: never "exact"', () => expect(show(COPY.filter((c) => EXACT.test(c.text)))).toEqual([]));
  it("the checks catch what they should", () => {
    for (const bad of ["Done!", "Act now to stay safe.", "Don't wait!", "Get the exact amounts.", "Only 3 left"]) {
      expect(EXCLAIM.test(bad) || URGENCY.some((re) => re.test(bad)) || EXACT.test(bad), bad).toBe(true);
    }
    for (const ok of ["!important", "a !== b", "<!doctype html>", "Start with these 3.", REASSURANCE]) {
      expect(EXCLAIM.test(ok) || URGENCY.some((re) => re.test(ok)) || EXACT.test(ok), ok).toBe(false);
    }
  });
});

/** Plan text (web, PDF, email all render this document). Danger callouts and decision triggers are safety instructions. */
function calmText(doc: PlanDocument): string[] {
  const out: string[] = [doc.title, doc.subtitle ?? ""];
  const walk = (b: Block) => {
    if (b.type === "callout" && b.tone === "danger") return;
    if (b.type === "ifthen") return;
    out.push(untrademarked(JSON.stringify(b)));
  };
  for (const s of doc.sections) {
    out.push(s.title, s.summary ?? "");
    s.blocks.forEach(walk);
  }
  return out;
}
describe("DESIGN.md C1 / C2 / T9: every persona's plan", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s", async (_n, a) => {
    const text = calmText((await buildPlan(a)).document);
    const hits = text.filter((t) => EXCLAIM.test(t) || URGENCY.some((re) => re.test(t)) || EXACT.test(t));
    expect(hits.map((h) => h.slice(0, 200))).toEqual([]);
  });
});

/** C3: red is for safety only. Every use of the danger color is a safety callout, a "Don't do this" list or the CO box. */
describe("DESIGN.md C3: red only for real safety warnings", () => {
  const RED = /\bdanger\b|--danger|text-danger|border-danger|bg-danger|\bred-\d{3}\b|#a1261b|#f08a7e|#ff0000|\bcolor:\s*red\b/i;
  const SAFETY_USE = /tone|toneCls|Don(.|&apos;)t do this|dontDo|Carbon monoxide|\bco:|--danger:|--color-danger|danger: "#a1261b"/;
  const ALLOWED = new Set(["components/PlanView.tsx", "lib/email/render.ts", "lib/pdf/PlanPdf.tsx", "lib/pdf/FridgeChecklist.tsx", "app/globals.css"].map((f) => f.replace(/\//g, "\\")).concat(["components/PlanView.tsx", "lib/email/render.ts", "lib/pdf/PlanPdf.tsx", "lib/pdf/FridgeChecklist.tsx", "app/globals.css"]));
  const styled = [...SOURCES, "app/globals.css"];
  it("only the safety renderers use red, and only for safety blocks", () => {
    const hits: string[] = [];
    for (const f of styled) {
      readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line) || !RED.test(line)) return;
        // Words, not color: "dangerous" in copy, the linter's DANGER_WORD, the plan's tone enum.
        if (/\bdangerous\b|DANGER_WORD|isDanger|z\.enum\(\["danger"/.test(line) && !/text-danger|border-danger|#a1261b|--danger/.test(line)) return;
        if (/tone: "danger"|tone: "danger" as const|b\.tone === "danger"/.test(line) && !/className|style|color/.test(line)) return;
        if (!ALLOWED.has(f) || !SAFETY_USE.test(line)) hits.push(`${f}:${i + 1}  ${line.trim().slice(0, 140)}`);
      });
    }
    expect(hits).toEqual([]);
  });
});

/** C5: one amber button. Source check here; the rendered check is in e2e/design.spec.ts and /ux-pass metrics. */
describe("DESIGN.md C5: at most one primary (amber) button per page file", () => {
  it.each(SOURCES.filter((f) => /^app[\\/].*page\.tsx$/.test(f)).map((f) => [f]))("%s", (f) => {
    const n = (readFileSync(f, "utf8").match(/className="btn(?=[\s"])|<StartButton(?![^>]*secondary)/g) ?? []).length;
    expect(n).toBeLessThanOrEqual(1);
  });
});

/** C6: motion. Every looping animation is paused under reduced motion, and the global rule exists. */
describe("DESIGN.md C6: no motion under reduced motion", () => {
  it("globals.css turns off transitions and animation under prefers-reduced-motion", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*transition-duration:\s*0s[\s\S]*animation-duration:\s*0s/);
  });
  it("no transition over 250ms", () => {
    const hits = COPY.filter((c) => /\bduration-(\d+)\b/.test(c.text) && Number(c.text.match(/\bduration-(\d+)\b/)![1]) > 250);
    expect(show(hits)).toEqual([]);
  });
  it("looping animations (spin, pulse, ping, bounce) also stop with motion-reduce", () => {
    const hits = COPY.filter((c) => /\banimate-(spin|pulse|ping|bounce)\b/.test(c.text) && !/motion-reduce:animate-none|motion-safe:animate-/.test(c.text));
    expect(show(hits)).toEqual([]);
  });
});

/** T4 + T5: wherever a Buy link is rendered, the same component renders the note (prices are estimates, commissions). */
describe("DESIGN.md T4 / T5: Buy links come with the note", () => {
  it.each(SOURCES.filter((f) => /rel="sponsored/.test(readFileSync(f, "utf8"))).map((f) => [f]))("%s", (f) => {
    expect(readFileSync(f, "utf8")).toMatch(/BuyNote|data-testid="affiliate-disclosure"/);
  });
});

/** T6: no dark patterns in forms: nothing pre-ticked. */
describe("DESIGN.md T6: no pre-ticked boxes", () => {
  it("no defaultChecked or checked={true}", () => {
    const hits = SOURCES.flatMap((f) => readFileSync(f, "utf8").split(/\r?\n/).map((l, i) => [f, i + 1, l] as const)).filter(([, , l]) => /defaultChecked|checked=\{true\}/.test(l));
    expect(hits.map(([f, n, l]) => `${f}:${n} ${l.trim()}`)).toEqual([]);
  });
});

/** T8: errors say what happened and what to do, and never blame. */
describe("DESIGN.md T8: errors", () => {
  it("every shared error sentence names a next step and blames no one", () => {
    for (const [k, m] of Object.entries(ERR)) {
      expect(m, k).not.toMatch(BLAME);
      expect(m, k).toMatch(/[.]$/);
      expect(m, k).toMatch(/\b(try again|check|reload|sign in|go back|enter|start|wait)\b/i);
    }
  });
  it("raw server or browser text never reaches the screen", () => {
    for (const [status, raw] of [[404, "Not found"], [403, "Bad origin"], [401, "Sign in first"], [400, "Invalid"], [429, "Slow down"], [500, "Internal Server Error"], [400, undefined]] as const) {
      const m = friendlyError(status, raw, ERR.save);
      expect(m).not.toBe(raw);
      expect(m).not.toMatch(BLAME);
    }
    expect(errorFromThrown(new TypeError("Failed to fetch"), ERR.build)).toBe(ERR.network);
    expect(friendlyError(400, ERR.email, ERR.save)).toBe(ERR.email);
  });
  it("routes people reach send plain sentences, not codes", () => {
    const VISITOR = ["app/api/plans/[id]/claim/route.ts", "app/api/auth/login/route.ts", "app/api/auth/resend/route.ts", "app/api/questionnaire/[id]/generate/route.ts", "app/api/account/prefs/route.ts"];
    for (const f of VISITOR) {
      for (const m of readFileSync(f, "utf8").matchAll(/err\("([^"]+)"(?:,\s*(\d+))?\)/g)) {
        const status = Number(m[2] ?? 400);
        if ([401, 403, 404].includes(status)) continue; // the client maps these (friendlyError)
        expect(m[1], `${f}: ${m[1]}`).not.toMatch(BLAME);
        expect(m[1], `${f}: ${m[1]}`).toMatch(/\s.*[.?]$/);
      }
    }
  });
});
