// Resolve the `exceljs` package whether this script runs from inside the
// InnocenZ-proto repo (plain import works) or from the global skill copy at
// ~/.claude/skills (plain import fails → fall back to the repo's node_modules).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export async function loadExcelJS() {
  try {
    return (await import('exceljs')).default;
  } catch {
    /* not resolvable from here — try the known repo location(s) below */
  }
  const bases = [
    process.env.INNOCENZ_REPO,
    'C:/Users/jinkg/Downloads/InnocenZ/InnocenZ-proto',
    process.cwd(),
  ].filter(Boolean);
  for (const base of bases) {
    try {
      const req = createRequire(pathToFileURL(base.replace(/[\\/]+$/, '') + '/package.json'));
      const resolved = req.resolve('exceljs');
      return (await import(pathToFileURL(resolved).href)).default;
    } catch {
      /* try next base */
    }
  }
  throw new Error(
    'exceljs not found. Run from the InnocenZ-proto repo, or set INNOCENZ_REPO ' +
      'to its path (it must have node_modules installed).'
  );
}
