/** Emit index.html + 404.html for GitHub Pages (TanStack Start client build). */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.GITHUB_PAGES === "true" ? "/InnocenZ-proto/" : "/";
const clientAssets = join(process.cwd(), "dist", "client", "assets");
const serverAssets = join(process.cwd(), "dist", "server", "assets");

async function findRootEntryFromManifest() {
  const files = await readdir(serverAssets);
  const manifestFile = files.find((f) => f.startsWith("_tanstack-start-manifest_v-"));
  if (!manifestFile) return null;

  const content = await readFile(join(serverAssets, manifestFile), "utf8");
  const match =
    content.match(/__root__:\s*\{[\s\S]*?preloads:\s*\[\s*"[^"]*\/(index-[^"]+\.js)"/) ||
    content.match(/__root__:\s*\{[\s\S]*?src:\s*"[^"]*\/(index-[^"]+\.js)"/);
  return match ? match[1] : null;
}

async function findLargestIndexBundle() {
  const files = await readdir(clientAssets);
  const candidates = files.filter((f) => /^index-[\w-]+\.js$/.test(f));
  let best = null;
  let bestSize = 0;
  for (const f of candidates) {
    const size = (await stat(join(clientAssets, f))).size;
    if (size > bestSize) {
      bestSize = size;
      best = f;
    }
  }
  return best;
}

const entry = (await findRootEntryFromManifest()) || (await findLargestIndexBundle());
if (!entry) {
  console.error("Could not find TanStack Start client entry in dist/");
  process.exit(1);
}

const cssFiles = await readdir(clientAssets);
const css = cssFiles.find((f) => /^styles-[\w-]+\.css$/.test(f));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#08070c" />
  <title>InnocenZ</title>
  ${css ? `<link rel="stylesheet" href="${base}assets/${css}" />` : ""}
</head>
<body>
  <script type="module" src="${base}assets/${entry}"></script>
</body>
</html>
`;

const outDir = join(process.cwd(), "dist", "client");
await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "404.html"), html);
await writeFile(join(outDir, ".nojekyll"), "");
console.log(`Wrote dist/client/index.html → ${entry}`);
