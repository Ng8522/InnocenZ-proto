---
name: innocenz-mvp
description: >-
  Re-audit and update the InnocenZ MVP tracking workbook
  (InnocenZ_MVP_v8_Jul2026.xlsx) so it matches the live InnocenZ-proto app.
  Use whenever the InnocenZ-proto repo (routes, components, lib helpers, RBAC)
  changes and the Excel's "what's actually built" columns need re-verifying —
  confirm functions/routes that still exist, correct stale claims, and flag
  removed/unused (dead) code. Keeps the workbook's status, gaps, Role Matrix,
  RBAC Matrix and Changelog in sync with src/. Triggers: "update the InnocenZ
  MVP excel", "re-audit the workbook", "sync the spreadsheet to the prototype".
---

# InnocenZ MVP — keep the tracking workbook in sync with the live app

## What this skill does

The workbook **`InnocenZ_MVP_v8_Jul2026.xlsx`** (kept next to the repo, at
`../InnocenZ_MVP_v8_Jul2026.xlsx` relative to the repo root, i.e.
`C:\Users\jinkg\Downloads\InnocenZ\InnocenZ_MVP_v8_Jul2026.xlsx`) is the
single source of truth describing what the **InnocenZ-proto** prototype does,
role by role. Its status/gap columns must reflect the **running app**, whose
source of truth is the repo's **`src/`** directory (NOT `dist/` or
`prototype/`, which are stale).

Your job when invoked: **diff the workbook's claims against current `src/`**,
then surgically update only the cells that are wrong — confirming functions
that still exist, correcting stale claims, and flagging code that has been
removed or is now unused/dead. **Never rewrite the whole workbook** — it is
heavily styled (colour-coded statuses, freeze panes, autofilters, live
formulas). Edit specific cells so all formatting survives.

## The workbook has 8 sheets

1. **Overview** — product summary + snapshot counts (`N Done · N Partial · N Missing`).
2. **Modules 1-8** — functional spec × prototype coverage; per row: `Prototype Route` (col G), `Status` (col H), `Prototype Gap` (col I).
3. **E2E Flow** — every screen/button by role. Cols: A Role, B Section, C Screen, D Steps, E Rules, **F Status**, **G Gap Notes**, H Cross-Role Flow, I Route.
4. **Role Matrix** — routes each role can open + RBAC source.
5. **RBAC Matrix** — actions × 8 roles; last col = what the prototype enforces.
6. **Audit Formula** — Golden zero-sum check, live Excel formulas (do not break).
7. **Build Plan** — priorities, P0 backlog (dead code + gaps), roadmap.
8. **Changelog** — version history. **Always append a new dated row here** describing each re-audit pass.

Status legend used throughout: `✅ Done`, `⚠️ Partial`, `❌ Missing`.
`▲` prefixes an audit note. `★` marks a key rule.

## Workflow

### 1. Read the current state
- Dump the workbook to text:
  `node .claude/skills/innocenz-mvp/scripts/dump-workbook.mjs "<xlsx path>" > dump.txt`
  (run from repo root so `node` resolves `./node_modules/exceljs`).
- Inventory the live code: list `src/routes/`, `src/lib/`, `src/components/**`.

### 2. Verify claims against `src/`
Walk the audit checklist in
[`reference/audit-checklist.md`](reference/audit-checklist.md). For every
route / component / lib helper the workbook names, confirm it still exists and
is still imported. Grep the load-bearing facts (see checklist) rather than
trusting the workbook. Categorise each discrepancy:
- **Still exists / newly built** → flip `❌/⚠️` → `⚠️/✅`, update the route + gap note.
- **Stale claim** (workbook says removed/missing but code has it, or vice-versa) → correct the note.
- **Removed or unused (dead) code** → flag in the Build Plan P0 backlog and the relevant gap note; do not silently delete workbook rows unless the user asks.

### 3. Locate exact cells, then edit
- Find which cell holds a claim:
  `node .claude/skills/innocenz-mvp/scripts/find-cells.mjs "<xlsx>" "<search text>"`
- Read a cell's exact current value:
  `node .claude/skills/innocenz-mvp/scripts/get-cell.mjs "<xlsx>" "<sheet>" "<A1>"`
- Apply edits from a JSON file (auto-backs-up first, preserves all styling,
  can append styled rows for the Changelog):
  `node .claude/skills/innocenz-mvp/scripts/apply-edits.mjs edits.json`
  See [`scripts/edits.example.json`](scripts/edits.example.json) for the shape.

### 4. Keep counts + Changelog honest
- If any Status cell flips, recompute the Overview snapshot counts
  (`Done/Partial/Missing`) so they still add up, and update the E2E sheet's
  final SNAPSHOT row.
- Append a `Changelog` row: version tag (e.g. `Jul 2026 v8.2`) + what changed.

### 5. Verify the round-trip
After writing, re-dump the workbook and re-run `find-cells` to confirm the
edits landed. `apply-edits.mjs` already checks fills/autofilters/freeze-panes
survived; report any drift.

## Automatic sync on every commit (git post-commit hook)

A hook at `.git/hooks/post-commit` runs
[`scripts/sync-check.mjs`](scripts/sync-check.mjs) after **every commit** in
InnocenZ-proto. It:
- fingerprints the live app (route/lib/component file lists + load-bearing code
  facts) and compares to `.claude/skills/innocenz-mvp/.sync-baseline.json`;
- always writes `../InnocenZ_MVP_sync-report.txt` (next to the workbook);
- on **material drift only**, appends a dated `auto-sync` row to the workbook
  Changelog flagging that a full re-audit is due, and refreshes the baseline.
  No drift ⇒ the `.xlsx` is left untouched (no per-commit spam).

The hook does the *mechanical* refresh automatically; run **`/innocenz-mvp`**
when you want the full judgement-based re-audit (status flips, gap wording,
RBAC, snapshot counts). To re-run the check by hand:
`node .claude/skills/innocenz-mvp/scripts/sync-check.mjs`.
Re-clone the repo? Re-create the hook (it lives in `.git/`, which git doesn't
track) by copying the same one-liner that calls `sync-check.mjs`.

## Guardrails
- **Python/openpyxl is NOT available** on this machine — use the bundled
  ExcelJS scripts (they resolve `exceljs` from the repo's `node_modules`).
- ExcelJS is safe here because the workbook has no charts, images, pivot
  tables, conditional formatting or data-validation — only fills, fonts,
  formulas, freeze panes and autofilters, all of which round-trip cleanly.
  If a future workbook adds any of those, re-verify before trusting a write.
- Only change cells you have a source-verified reason to change. Leave spec
  columns (workflow, rules, formulas) alone unless the spec itself changed.
- The temporary helper scripts `_dumpxlsx.mjs`, `_findcells.mjs`, `_getcell.mjs`,
  `_editwb.mjs` at the repo root are scratch — the canonical copies live in this
  skill's `scripts/`. Don't commit the root scratch copies.
