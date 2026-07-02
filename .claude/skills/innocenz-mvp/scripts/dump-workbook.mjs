// Dump every sheet of an .xlsx to plain text (row-by-row, pipe-separated).
// Usage (run from repo root so exceljs resolves from ./node_modules):
//   node .claude/skills/innocenz-mvp/scripts/dump-workbook.mjs "<path-to.xlsx>"
import { loadExcelJS } from './_load-exceljs.mjs';
const ExcelJS = await loadExcelJS();

const path = process.argv[2];
if (!path) { console.error('Usage: dump-workbook.mjs <xlsx>'); process.exit(1); }

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path);
console.log('SHEETS:', wb.worksheets.map((w) => w.name).join(' | '));
for (const ws of wb.worksheets) {
  console.log(`\n\n===== SHEET: ${ws.name} (rows=${ws.rowCount}, cols=${ws.columnCount}) =====`);
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let v = cell.value;
      if (v && typeof v === 'object') {
        if (v.richText) v = v.richText.map((t) => t.text).join('');
        else if (v.text) v = v.text;
        else if (v.result !== undefined) v = v.result;
        else if (v.hyperlink) v = v.text || v.hyperlink;
        else if (v.formula) v = `=${v.formula}`;
        else v = JSON.stringify(v);
      }
      vals.push(v === null || v === undefined ? '' : String(v));
    });
    console.log(`${rn}: ${vals.join(' | ')}`);
  });
}
