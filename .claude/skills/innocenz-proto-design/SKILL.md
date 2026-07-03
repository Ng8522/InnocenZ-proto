---
name: innocenz-proto-design
description: >-
  Restyle and polish the InnocenZ-proto UI role by role WITHOUT changing
  behaviour. Use whenever the user wants the prototype to look better, be
  easier to read/use, adjust fonts/spacing/hierarchy, apply the design system
  consistently, or clean stale wording — while keeping every function, route,
  RBAC rule and data flow exactly as-is. Enforces the role→view contract
  (Agency + Outlet = web view, PR = app view, UAB Admin = web view) and drives
  changes through the shared theme tokens instead of per-page rewrites.
  Triggers: "design the InnocenZ pages", "make the fonts bigger", "make the
  roles easier to see/use", "polish the UI", "restyle the outlet/agency/PR
  portal", "/innocenz-proto-design".
---

# InnocenZ-proto — design & restyle the prototype (design only, never logic)

## Golden rule

**Design/appearance only. Never touch functionality.** Do not change routes,
handlers, state (`useStore`), RBAC (`agency-rbac`, `outlet-rbac`), data/demo
seeds, calculations, or component props that drive behaviour. You may edit:
CSS (`src/prototype-theme.css`), className strings, static UI copy, element
grouping/ordering for visual hierarchy, and design tokens. When in doubt,
change a **token**, not a component.

## The role → view contract (invariant — keep it this way)

| Role | Route prefix | Shell | View |
|------|-------------|-------|------|
| PR Agency | `src/routes/agency.*` | `PortalShell portal="agency"` (`src/components/portal/PortalShell.tsx`) | **Web** (sidebar + header, mobile footer fallback) |
| Outlet | `src/routes/outlet.*` | `PortalShell portal="outlet"` | **Web** |
| PR Personnel | `src/routes/host.*` | `PhoneFrame` + `.iz-pr-app` (`src/routes/host.tsx`, `src/components/Brand.tsx`) | **App** (phone frame + bottom tab bar) |
| UAB Admin | `src/routes/admin.*` | admin shell | **Web** |
| Auth | `index`, `signin`, `register`, `reset-password` | `PortalAuthFrame` | Web |

Never move a role from web→app or app→web. The PR role stays inside the phone
frame; Agency/Outlet/Admin stay in the responsive web portal.

## The design system lives in ONE file

`src/prototype-theme.css` (~320KB) is the single source of truth for look &
feel, imported globally by `src/styles.css` (`@import "./prototype-theme.css"`).
It is `data-portal`-scoped, so a token edit restyles **every page of every
role at once** — this is the preferred lever over editing 40+ route files.

### Typography scale (the "make it bigger / easier to read" lever)

Defined in `:root`, near the top of the file:

```css
--iz-fs-base: 20px;   /* body copy — bump this to grow everything */
--iz-fs-tiny: 17px;   /* captions / meta */
--iz-fs-sm:   19px;   /* secondary text */
--iz-fs-label:16px;   /* form labels / eyebrow */
--iz-portal-fs: 20px; /* agency + outlet + PR-app root rem */
```

**Gotcha:** `--iz-portal-fs` is redefined in **three** more scoped selectors
lower in the file (search `--iz-portal-fs`):
`[data-portal="outlet"] .iz-portal-main`, `html:has(.iz-portal)…`, and
`.iz-portal`. These are more specific than `:root`, so to change the portal
font you must update **all four** occurrences to the same value, then reload
and verify the computed value (see Verify). `html:has(...)` sets the rem base,
so it also scales Tailwind `text-*` / spacing utilities — bump gently
(one step at a time, e.g. 19→20→21) to avoid crowding tight tables and the
narrow phone view.

Colour / surface tokens (`--iz-bg`, `--iz-panel`, `--iz-txt`, `--iz-muted`,
`--iz-grad*`, traffic colours) live in the same `:root` block — recolour there,
never by hardcoding hexes in components.

## Workflow

1. **Confirm scope with the user** if unclear: token polish only (safest,
   restyles all pages), tokens + per-page layout tweaks, or full per-page
   redesign. Default to **token polish**.
2. **Edit tokens first.** For "bigger/easier to read", raise the `--iz-fs-*`
   scale and (if portal-wide) all four `--iz-portal-fs` copies. For clearer
   hierarchy, adjust heading weight/size/spacing tokens rather than per-page.
3. **Per-role polish, only if asked** — restyle within the role's existing
   shell using existing classes; keep the web/app contract above.
4. **Verify in the live preview** every observable change (see below).
5. **Report** what changed, that no logic/RBAC/routes were touched, and show a
   screenshot at the correct width (desktop for web roles, mobile for PR).

## Cleanup of stale copy / dev cruft (conservative)

Only remove things that are genuinely stale UI artefacts — real leftover
`TODO`/`WIP`/`Coming soon`/placeholder copy, or wording the user names. **Do
not invent deletions.** Note the traps in this repo: `placeholder` (input
prop), `disabledPlaceholder`, `demoPlaceholderImage`, the **"Future"** shift
label + `isFuture`/`todayFuture` helpers, and `@deprecated` JSDoc are all
**legitimate** — leave them. Never touch a "word" if it's a domain term, a prop
name, or referenced in logic. Reword for clarity only; keep the meaning.

## Verify (preview tools — never ask the user to check manually)

The dev server is `innocenz-dev` (from `.claude/launch.json`). After a change:

- `preview_start` / `preview_list` to get the `serverId`.
- Reload: `preview_eval` → `document.location.reload()`.
- Confirm token landed:
  `getComputedStyle(document.documentElement).getPropertyValue('--iz-fs-base')`
  and, for portal font, the computed `font-size` of `.iz-portal-main`.
- `preview_console_logs level:error` — must be clean.
- `preview_resize desktop` before screenshotting Agency/Outlet/Admin;
  `preview_resize mobile` for the PR (`/host`) app view.
- `preview_screenshot` as proof.

## Gotchas / guardrails

- The repo has a **fact-forcing gate** on Bash/Edit/Write. Before each such
  call, state: importers of the file, functions/classes affected, data I/O, and
  the user's instruction. For `prototype-theme.css` the only importer is
  `src/styles.css`; it affects no functions (CSS custom props only).
- `src/routeTree.gen.ts` is **generated** — never hand-edit it.
- Keep changes to `src/` (the live app). `prototype/` and `dist/` are stale.
- One token step at a time; re-verify. Don't hardcode colours or font sizes in
  components when a token exists.
