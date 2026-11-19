import fs from "node:fs";
import { PDFDocument } from "pdf-lib";
import { PERSONAS } from "@/tests/fixtures/personas";

/**
 * End-to-end smoke test: runs the 10 focus-group households through a running server
 * (start → autosave → plan → PDFs → optional email → confirm → plan email → export → delete).
 *   READYPLAN_DATA_DIR=.data/loop APP_URL=http://localhost:3300 npx next start -p 3300 &
 *   npm run smoke            (or SMOKE_URL=https://yourdomain npm run smoke — demo-mode servers only)
 */
const BASE = process.env.SMOKE_URL || "http://localhost:3300";
const OUT = `${process.env.READYPLAN_DATA_DIR || ".data/loop"}/outbox`;
const O = { origin: BASE };
type R = { name: string; ok: boolean; issues: string[]; t: Record<string, number>; info: Record<string, unknown> };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(i: number): Promise<R> {
  const p = PERSONAS[i];
  const res: R = { name: p.name, ok: true, issues: [], t: {}, info: {} };
  let cookie = "";
  const take = (r: Response) => {
    const sc = r.headers.getSetCookie().find((c) => c.startsWith("rp_session="));
    if (sc) cookie = sc.split(";")[0];
  };
  const req = async (label: string, path: string, init: RequestInit = {}) => {
    const t0 = performance.now();
    const r = await fetch(BASE + path, { redirect: "manual", ...init, headers: { ...(init.headers as object), ...(cookie ? { cookie } : {}) } });
    res.t[label] = Math.round(performance.now() - t0);
    take(r);
    return r;
  };
  const fail = (m: string) => { res.ok = false; res.issues.push(m); };

  let r = await req("home", "/");
  if (r.status !== 200) fail(`home ${r.status}`);
  r = await req("start", "/api/start", { method: "POST", headers: O });
  const loc = r.headers.get("location") ?? "";
  const qid = loc.split("/q/")[1];
  if (r.status !== 303 || !qid) return fail(`start ${r.status}`), res;
  r = await req("questionnaire", `/q/${qid}`);
  if (r.status !== 200) fail(`q page ${r.status}`);
  r = await req("autosave", `/api/questionnaire/${qid}`, { method: "PUT", headers: { ...O, "content-type": "application/json" }, body: JSON.stringify({ answers: { ...p.a, _step: 4 } }) });
  if (r.status !== 200) fail(`autosave ${r.status}`);
  r = await req("generate", `/api/questionnaire/${qid}/generate`, { method: "POST", headers: { ...O, "content-type": "application/json" }, body: JSON.stringify({ answers: p.a, consent: { terms: true, health: true } }) });
  const g = (await r.json()) as { planId?: string; error?: string };
  if (!g.planId) return fail(`generate ${r.status} ${g.error}`), res;
  const pid = g.planId;
  r = await req("planPage", `/plan/${pid}`);
  const html = await r.text();
  if (r.status !== 200) fail(`plan page ${r.status}`);
  if (!html.includes("Start here: your first 3 steps")) fail("no first steps");
  if (!html.includes("Email me my plan")) fail("no email box");
  res.info.planHtmlKB = Math.round(html.length / 1024);
  res.info.sections = (html.match(/<h2 id="[a-z0-9]+-h"/g) ?? []).length;
  res.info.hazards = html.includes("Your area&#x27;s hazards") || html.includes("Your area's hazards");
  for (const kind of ["pdf", "checklist"]) {
    r = await req(kind, `/api/plans/${pid}/${kind}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.subarray(0, 4).toString() !== "%PDF") fail(`${kind} not a PDF`);
    fs.writeFileSync(`.data/loop/${i}-${kind}.pdf`, buf);
    // Count pages with pdf-lib (works on Windows too; no pdfinfo needed).
    const pages = (await PDFDocument.load(buf, { updateMetadata: false })).getPageCount();
    res.info[`${kind}Pages`] = pages;
    if (kind === "checklist" && pages !== 1) fail(`fridge checklist is ${pages} pages`);
  }
  // À la carte: tick an item, switch water to Premium, and check the rebuilt plan kept the tick and shows the level
  r = await req("tick", `/api/plans/${pid}/checks`, { method: "PUT", headers: { ...O, "content-type": "application/json" }, body: JSON.stringify({ checks: { "week-1": true } }) });
  if (r.status !== 200) fail(`tick ${r.status}`);
  const form = new URLSearchParams({ group: "water", level: "premium", back: "gear" });
  r = await req("choose", `/api/plans/${pid}/choose`, { method: "POST", headers: { ...O, "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
  const newPid = (r.headers.get("location") ?? "").split("/plan/")[1]?.split("#")[0];
  if (r.status !== 303 || !newPid || newPid === pid) fail(`choose ${r.status} ${r.headers.get("location")}`);
  else {
    r = await req("choosePage", `/plan/${newPid}`);
    const h2 = await r.text();
    if (!h2.includes("Stackable water bricks")) fail("premium water not shown after choose");
    if (!/✓ <!-- -->Premium|✓ Premium/.test(h2)) fail("premium not marked selected");
    if (!/checked=""[^>]*>|aria-checked/.test(h2) && !h2.includes('"week-1":true')) res.info.tickCarried = "not visible in HTML";
    res.info.levels = (h2.match(/aria-label="Choose a level"/g) ?? []).length;
  }
  const before = fs.existsSync(OUT) ? new Set(fs.readdirSync(OUT)) : new Set<string>();
  const email = `loop${i}@example.com`;
  r = await req("claim", `/api/plans/${pid}/claim`, { method: "POST", headers: { ...O, "content-type": "application/json" }, body: JSON.stringify({ email, updates: i % 2 === 0 }) });
  const c = (await r.json()) as { demoLink?: string; status?: string; error?: string };
  if (r.status !== 200 || !c.demoLink) return fail(`claim ${r.status} ${c.error}`), res;
  r = await req("confirm", c.demoLink.replace(/^https?:\/\/[^/]+/, ""));
  if (r.status !== 307 && r.status !== 302) fail(`confirm ${r.status}`);
  if (!(r.headers.get("location") ?? "").includes(`/plan/${pid}?emailed=1`)) fail(`confirm redirect ${r.headers.get("location")}`);
  let planMail: string | undefined;
  for (let k = 0; k < 40 && !planMail; k++) {
    await sleep(250);
    planMail = fs.readdirSync(OUT).find((f) => !before.has(f) && f.endsWith("-plan.html"));
  }
  if (!planMail) fail("plan email not sent");
  else {
    const kb = fs.statSync(`${OUT}/${planMail}`).size / 1024;
    res.info.emailKB = Math.round(kb);
    if (kb > 100) fail(`email ${kb.toFixed(0)} KB (Gmail clips >102 KB)`);
    const atts = fs.readdirSync(OUT).filter((f) => f.startsWith(planMail!.replace(".html", "")) && f.endsWith(".pdf"));
    if (atts.length !== 2) fail(`email has ${atts.length} attachments`);
    const m = fs.readFileSync(`${OUT}/${planMail}`, "utf8");
    if (/amazon\./i.test(m)) fail("amazon link in email");
    if (!m.includes("Unsubscribe")) fail("no unsubscribe");
  }
  for (const pth of ["/sample", "/terms", "/privacy", "/account"]) {
    r = await req(pth, pth);
    if (r.status !== 200) fail(`${pth} ${r.status}`);
  }
  r = await req("export", "/api/account/export");
  const ex = (await r.json()) as { user?: { email: string; followups_opt_in: boolean } };
  if (ex.user?.email !== email) fail("export wrong user");
  if (ex.user?.followups_opt_in !== (i % 2 === 0)) fail(`opt-in mismatch: ${ex.user?.followups_opt_in}`);
  r = await req("delete", "/api/account/delete", { method: "POST", headers: O });
  if (r.status !== 200) fail(`delete ${r.status}`);
  cookie = "";
  r = await req("afterDelete", `/plan/${pid}`);
  if (r.status !== 404) fail(`plan still visible after delete: ${r.status}`);
  return res;
}

const all: R[] = [];
for (let i = 0; i < PERSONAS.length; i++) all.push(await run(i));
for (const r of all) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name.padEnd(12)} gen ${r.t.generate}ms pdf ${r.t.pdf}ms claim ${r.t.claim}ms ${JSON.stringify(r.info)} ${r.issues.join("; ")}`);
const avg = (k: string) => Math.round(all.reduce((s, r) => s + (r.t[k] ?? 0), 0) / all.length);
console.log("avg ms:", ["home", "questionnaire", "autosave", "generate", "planPage", "pdf", "checklist", "choose", "claim", "confirm"].map((k) => `${k}=${avg(k)}`).join(" "));
