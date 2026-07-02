// Deterministic InnocenZ sync check — meant to run from a git post-commit hook.
//
//  • Fingerprints the live app: the file lists under src/routes, src/lib,
//    src/components plus a handful of load-bearing code facts (see checklist).
//  • Compares that fingerprint to the last-recorded baseline.
//  • ALWAYS writes a human-readable report next to the workbook.
//  • ONLY when something material changed: appends a dated "drift" row to the
//    workbook Changelog (flagging that a full /innocenz-mvp re-audit is due)
//    and rewrites the baseline. No drift ⇒ the .xlsx is left untouched (no spam).
//
// Usage:  node .claude/skills/innocenz-mvp/scripts/sync-check.mjs
// Env:    INNOCENZ_REPO      (default: this repo / cwd)
//         INNOCENZ_WORKBOOK  (default: ../InnocenZ_MVP_v8_Jul2026.xlsx)
import { loadExcelJS } from './_load-exceljs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = (process.env.INNOCENZ_REPO || process.cwd()).replace(/[\\/]+$/, '');
const WORKBOOK =
  process.env.INNOCENZ_WORKBOOK ||
  path.join(REPO, '..', 'InnocenZ_MVP_v8_Jul2026.xlsx');
const BASELINE = path.join(REPO, '.claude', 'skills', 'innocenz-mvp', '.sync-baseline.json');
const REPORT = path.join(path.dirname(WORKBOOK), 'InnocenZ_MVP_sync-report.txt');

const listFiles = (rel, exts) => {
  const dir = path.join(REPO, rel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(path.relative(REPO, p).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out.sort();
};

const read = (rel) => {
  try { return fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch { return ''; }
};
const exists = (rel) => fs.existsSync(path.join(REPO, rel));

// --- gather the live fingerprint ---
const routes = listFiles('src/routes', ['.tsx']).filter((f) => !/__root|README/.test(f));
const libs = listFiles('src/lib', ['.ts']);
const components = listFiles('src/components', ['.tsx', '.ts']).filter((f) => !f.includes('/ui/'));

const facts = {
  geofenceSoftFail: /DEMO_RELAX_CHECK_IN_GEOFENCE\s*=\s*true/.test(read('src/lib/pr-check-in-geofence.ts')),
  signPrPvStopsAtSigned: /signPrPv/.test(read('src/lib/store.ts')),
  welcomeHardcodesPrTied: /setPrSubRole\(["']pr_tied["']\)/.test(read('src/routes/index.tsx')),
  agencyAnalyticsRouteExists: exists('src/routes/agency.analytics.tsx'),
  weeklyReconciliation: exists('src/lib/reconciliation-weekly.ts'),
  cancellationPenalty: exists('src/lib/pr-schedule-cancellation.ts'),
  realPvXlsxExport: /exceljs/i.test(read('src/lib/pv-pdf.ts')),
  adminBellDuplicate:
    exists('src/components/admin/AdminNotificationBell.tsx') &&
    !/admin\/AdminNotificationBell/.test(
      [...routes, ...components].map(read).join('\n')
    ),
  outletSalesDeadRoute: exists('src/routes/outlet.sales.tsx'),
};

const snapshot = { routes, libs, components, facts };
const sig = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

// --- compare with baseline ---
let baseline = null;
try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { /* first run */ }

const diffList = (a = [], b = []) => ({
  added: b.filter((x) => !a.includes(x)),
  removed: a.filter((x) => !b.includes(x)),
});
const now = new Date();
const iso = now.toISOString().slice(0, 19).replace('T', ' ');

let drift = [];
if (!baseline) {
  drift.push('First run — baseline established.');
} else if (baseline.sig !== sig) {
  const r = diffList(baseline.snapshot.routes, routes);
  const l = diffList(baseline.snapshot.libs, libs);
  const c = diffList(baseline.snapshot.components, components);
  if (r.added.length) drift.push(`routes added: ${r.added.join(', ')}`);
  if (r.removed.length) drift.push(`routes removed: ${r.removed.join(', ')}`);
  if (l.added.length) drift.push(`lib added: ${l.added.join(', ')}`);
  if (l.removed.length) drift.push(`lib removed: ${l.removed.join(', ')}`);
  if (c.added.length) drift.push(`components added: ${c.added.join(', ')}`);
  if (c.removed.length) drift.push(`components removed: ${c.removed.join(', ')}`);
  for (const k of Object.keys(facts)) {
    if (baseline.snapshot.facts[k] !== facts[k])
      drift.push(`fact ${k}: ${baseline.snapshot.facts[k]} -> ${facts[k]}`);
  }
}

// --- always write the report ---
const report =
  `InnocenZ sync check — ${iso}\n` +
  `repo:     ${REPO}\n` +
  `workbook: ${WORKBOOK}\n` +
  `counts:   ${routes.length} routes · ${libs.length} lib · ${components.length} components\n` +
  `facts:    ${JSON.stringify(facts, null, 2)}\n` +
  (drift.length
    ? `\n>>> DRIFT DETECTED — run /innocenz-mvp for a full re-audit:\n- ${drift.join('\n- ')}\n`
    : `\nNo drift since last baseline. Workbook left untouched.\n`);
fs.writeFileSync(REPORT, report);
console.log(report);

// --- on real drift (not first run), stamp the workbook Changelog + refresh baseline ---
const materialDrift = drift.length && baseline;
if (materialDrift && fs.existsSync(WORKBOOK)) {
  try {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(WORKBOOK);
    const cl = wb.getWorksheet('Changelog');
    if (cl) {
      // find first empty row in column A after the header
      let row = 4;
      while (cl.getCell(`A${row}`).value != null && String(cl.getCell(`A${row}`).value).trim() !== '') row++;
      const styleFrom = row - 1;
      cl.getRow(row).height = cl.getRow(styleFrom).height;
      for (const col of ['A', 'B']) {
        const s = cl.getCell(`${col}${styleFrom}`);
        cl.getCell(`${col}${row}`).style = JSON.parse(JSON.stringify(s.style));
      }
      cl.getCell(`A${row}`).value = `auto-sync ${now.toISOString().slice(0, 10)}`;
      cl.getCell(`B${row}`).value =
        `Post-commit auto-sync flagged code drift — run /innocenz-mvp for a full re-audit. Changes: ${drift.join('; ')}`;
      cl.getRow(row).commit();
      await wb.xlsx.writeFile(WORKBOOK);
      console.log(`Stamped Changelog row ${row} in the workbook.`);
    }
  } catch (e) {
    console.error('Could not stamp workbook:', e.message);
  }
}

// --- refresh baseline (create dir if needed) ---
fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
fs.writeFileSync(BASELINE, JSON.stringify({ sig, at: iso, snapshot }, null, 2));
