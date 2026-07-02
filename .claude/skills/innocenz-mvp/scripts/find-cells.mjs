// Find every cell (across all sheets) whose text contains a substring.
// Usage: node .claude/skills/innocenz-mvp/scripts/find-cells.mjs "<xlsx>" "<search text>"
import { loadExcelJS } from './_load-exceljs.mjs';
const ExcelJS = await loadExcelJS();

const [, , path, needle] = process.argv;
if (!path || !needle) { console.error('Usage: find-cells.mjs <xlsx> <text>'); process.exit(1); }

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path);
let hits = 0;
for (const ws of wb.worksheets) {
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    row.eachCell({ includeEmpty: false }, (cell, cn) => {
      let v = cell.value;
      if (v && typeof v === 'object') {
        if (v.richText) v = v.richText.map((t) => t.text).join('');
        else if (v.text) v = v.text;
        else if (v.result !== undefined) v = v.result;
        else v = JSON.stringify(v);
      }
      if (v != null && String(v).includes(needle)) {
        hits++;
        console.log(`SHEET='${ws.name}' ROW=${rn} COL=${cn} (${cell.address})`);
      }
    });
  });
}
if (!hits) console.log(`No cell contains: ${needle}`);
