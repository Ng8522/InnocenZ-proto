// Apply surgical cell edits to the workbook while preserving all styling.
// Auto-creates a timestamped .backup-*.xlsx next to the target first, then
// verifies fills / autofilters / freeze-panes survived the round-trip.
//
// Usage: node .claude/skills/innocenz-mvp/scripts/apply-edits.mjs <edits.json>
//
// edits.json shape:
// {
//   "workbook": "C:/Users/jinkg/Downloads/InnocenZ/InnocenZ_MVP_v8_Jul2026.xlsx",
//   "edits": [
//     { "sheet": "E2E Flow", "cell": "G27", "value": "corrected text..." }
//   ],
//   "appendRows": [
//     { "sheet": "Changelog", "cloneStyleFromRow": 10, "row": 11,
//       "cells": { "A": "Jul 2026 v8.2", "B": "what changed..." } }
//   ]
// }
import { loadExcelJS } from './_load-exceljs.mjs';
import fs from 'node:fs';
const ExcelJS = await loadExcelJS();

const cfgPath = process.argv[2];
if (!cfgPath) { console.error('Usage: apply-edits.mjs <edits.json>'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const wbPath = cfg.workbook;
if (!wbPath || !fs.existsSync(wbPath)) { console.error(`workbook not found: ${wbPath}`); process.exit(1); }

// --- fingerprint the original for a post-write integrity check ---
async function fingerprint(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  let filled = 0;
  const sheets = wb.worksheets.map((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (c) => {
      if (c.fill && c.fill.type) filled++;
    }));
    return {
      name: ws.name,
      autoFilter: JSON.stringify(ws.autoFilter || null),
      frozen: !!(ws.views && ws.views[0] && ws.views[0].state === 'frozen'),
    };
  });
  return { filled, sheets };
}
const before = await fingerprint(wbPath);

// --- backup ---
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
const backup = wbPath.replace(/\.xlsx$/i, `.backup-${stamp}.xlsx`);
fs.copyFileSync(wbPath, backup);
console.log('Backup:', backup);

// --- edit ---
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(wbPath);

for (const e of cfg.edits || []) {
  const ws = wb.getWorksheet(e.sheet);
  if (!ws) throw new Error(`No sheet: ${e.sheet}`);
  ws.getCell(e.cell).value = e.value;
  console.log(`edit  ${e.sheet}!${e.cell}`);
}

for (const a of cfg.appendRows || []) {
  const ws = wb.getWorksheet(a.sheet);
  if (!ws) throw new Error(`No sheet: ${a.sheet}`);
  const src = ws.getRow(a.cloneStyleFromRow);
  const dst = ws.getRow(a.row);
  if (src.height) dst.height = src.height;
  for (const col of Object.keys(a.cells)) {
    const s = ws.getCell(`${col}${a.cloneStyleFromRow}`);
    const d = ws.getCell(`${col}${a.row}`);
    d.style = JSON.parse(JSON.stringify(s.style)); // deep-copy fill/font/border/alignment
    d.value = a.cells[col];
  }
  dst.commit();
  console.log(`append ${a.sheet} row ${a.row}`);
}

await wb.xlsx.writeFile(wbPath);

// --- integrity check ---
const after = await fingerprint(wbPath);
const warn = [];
if (after.filled < before.filled * 0.98) warn.push(`filled cells ${before.filled} -> ${after.filled}`);
for (const b of before.sheets) {
  const a = after.sheets.find((s) => s.name === b.name);
  if (!a) { warn.push(`sheet lost: ${b.name}`); continue; }
  if (a.autoFilter !== b.autoFilter) warn.push(`autoFilter changed on ${b.name}`);
  if (a.frozen !== b.frozen) warn.push(`freeze pane changed on ${b.name}`);
}
console.log(warn.length ? `\n⚠️ INTEGRITY WARNINGS:\n- ${warn.join('\n- ')}` : '\n✅ Formatting preserved (fills, autofilters, freeze panes intact).');
console.log('Wrote', wbPath);
