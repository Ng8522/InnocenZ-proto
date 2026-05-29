/** Emit index.html + 404.html for GitHub Pages (client-only TanStack Start build). */
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.GITHUB_PAGES === "true" ? "/InnocenZ-proto/" : "/";
const clientDir = join(process.cwd(), "dist", "client", "assets");
const files = await readdir(clientDir);
const entry = files.find((f) => /^index-[\w-]+\.js$/.test(f));
const css = files.find((f) => /^styles-[\w-]+\.css$/.test(f));

if (!entry) {
  console.error("No client entry bundle found in dist/client/assets");
  process.exit(1);
}

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
  <div id="root"></div>
  <script type="module" src="${base}assets/${entry}"></script>
</body>
</html>
`;

const outDir = join(process.cwd(), "dist", "client");
await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "404.html"), html);
console.log("Wrote dist/client/index.html and 404.html");
