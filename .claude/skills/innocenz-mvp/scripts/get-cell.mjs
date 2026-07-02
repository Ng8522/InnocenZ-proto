// Print the exact current value of one cell (JSON-escaped so newlines show).
// Usage: node .claude/skills/innocenz-mvp/scripts/get-cell.mjs "<xlsx>" "<sheet>" "<A1>"
import { loadExcelJS } from './_load-exceljs.mjs';
const ExcelJS = await loadExcelJS();

const [, , path, sheet, addr] = process.argv;
if (!path || !sheet || !addr) {
  console.error('Usage: get-cell.mjs <xlsx> <sheet> <A1>');
  process.exit(1);
}
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path);
const ws = wb.getWorksheet(sheet);
if (!ws) { console.error(`No sheet named "${sheet}". Sheets: ${wb.worksheets.map((w) => w.name).join(', ')}`); process.exit(1); }
let v = ws.getCell(addr).value;
if (v && typeof v === 'object') {
  if (v.richText) v = v.richText.map((t) => t.text).join('');
  else if (v.formula) v = `=${v.formula} (result: ${v.result})`;
}
console.log(JSON.stringify(String(v)));
