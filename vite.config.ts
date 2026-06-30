// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

function readPkgVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readGitSha() {
  try {
    const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim().length > 0;
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "local";
  }
}

export default defineConfig({
  vite: {
    base: process.env.GITHUB_PAGES === "true" ? "/InnocenZ-proto/" : "/",
    define: {
      __IZ_APP_VERSION__: JSON.stringify(readPkgVersion()),
      __IZ_APP_GIT_SHA__: JSON.stringify(readGitSha()),
    },
    resolve: {
      dedupe: ["@tanstack/query-core", "@tanstack/react-query"],
    },
    ssr: {
      noExternal: ["@tanstack/react-query", "@tanstack/query-core"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
