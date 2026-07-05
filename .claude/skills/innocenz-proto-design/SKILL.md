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

### Warm secondary accent (already established)

The base palette was one-note violet (`--iz-gold` === `--iz-violet` === `#b79ce8`),
which made everything read flat. A contained **champagne-gold** accent now lives
in `:root` and is the signature "pop" against the violet:

```css
--iz-accent:   #e3b877;
--iz-accent-d: #c99b4e;
--iz-accent-l: #f2d9a0;
--iz-grad-accent: linear-gradient(135deg, #f2d9a0 0%, #e3b877 46%, #c99b4e 100%);
```

Do **not** repurpose `--iz-gold` (335 usages across 65 files — flipping it is
chaos). Use `--iz-accent*` and apply it **sparingly**, only on the elements
that should earn attention.

## The "design the whole page" recipe

When asked to design/polish a screen (or all screens), apply this consistent
treatment by editing the **shared theme classes** below — never per-page inline
styles. Because these classes are reused everywhere, editing them restyles
every screen that uses them at once. This is the established InnocenZ look:

| Element | Class(es) in `prototype-theme.css` | Treatment |
|---|---|---|
| Primary CTA buttons | `.iz-btn-primary` | `background: var(--iz-grad-accent)`, dark ink text, warm glow |
| Brand wordmark "Z" | `.iz-wordmark-z` | `var(--iz-grad-accent)` |
| Section headers | `.iz-sect-label` (+ `::before` tick) | `color: var(--iz-accent-l)`, weight 700, warm 2px tick, roomy top margin |
| Form field labels | `.iz-field-label` | `color: var(--iz-accent-d)`, uppercase eyebrow |
| Dashboard KPI tiles | `.iz-portal-kpi` `.l` / `.n` | `.l` → `var(--iz-accent-d)` uppercase eyebrow; tile gets a warm inset top-edge; `.n` bigger (agency 42px, generic 42px) + tabular numerals |
| Outlet report hero label | `.iz-outlet-report-hero__label` | `color: var(--iz-accent-d)`, uppercase eyebrow |
| Cards / containers | `.iz-card`, `.iz-portal-kpi` padding | more padding + bottom margin for breathing room |
| Body type scale | `--iz-fs-*` + all four `--iz-portal-fs` | 20px base (see Typography above) |

**Principles for any new screen:**
1. **Accent = highlights only** — CTAs, eyebrow labels, key marks. Never flood
   a screen with gold; violet stays the identity.
2. **Hierarchy via relationships, not uniform scale** — make primary numbers
   bigger/bolder and labels quieter; don't just enlarge everything equally
   (that changes nothing perceptually).
3. **Breathing room** — prefer more padding/gaps over cramming.
4. **Tabular numerals** (`font-variant-numeric: tabular-nums`) on any figure
   that sits in a column or updates live.
5. **Verify text fit** — long currency/labels must not clip; dial size back if
   a figure overflows its tile (e.g. keep KPI `.n` ≤ 42px so `RM 55,253.00`
   fits).

**Reaching a screen that looks unchanged:** some dashboards use bespoke inline
Tailwind, not these shared classes. Confirm which class actually renders (grep
the route/component for `className`, then find that selector — remember the
theme redefines many selectors in more-specific scoped blocks like
`[data-portal="agency"] .iz-portal-main …`, which win over `:root`). Edit the
**most specific** rule that actually applies, then verify the computed value.

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
