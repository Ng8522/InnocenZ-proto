/** Prerender index + 404 via TanStack Start server (GitHub Pages). */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const basePath = process.env.GITHUB_PAGES === "true" ? "/InnocenZ-proto" : "";
const origin = "http://localhost";
const routes = ["/", "/signin"];

const serverPath = pathToFileURL(join(process.cwd(), "dist", "server", "server.js")).href;
const { default: server } = await import(serverPath);

async function render(pathname) {
  const url = `${origin}${basePath}${pathname === "/" ? "/" : pathname}`;
  const res = await server.fetch(new Request(url));
  if (!res.ok) {
    throw new Error(`Prerender ${url} failed: ${res.status}`);
  }
  return res.text();
}

const outDir = join(process.cwd(), "dist", "client");
const homeHtml = await render("/");

await writeFile(join(outDir, "index.html"), homeHtml);
await writeFile(join(outDir, "404.html"), homeHtml);
await writeFile(join(outDir, ".nojekyll"), "");

console.log(`Prerendered ${routes.join(", ")} → dist/client/index.html (${homeHtml.length} bytes)`);
