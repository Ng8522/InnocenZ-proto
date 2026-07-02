# Audit checklist — workbook claim → how to verify in `src/`

Run every command from the repo root. `src/` is the only source of truth
(`dist/` and `prototype/` are stale — ignore them).

## A. Inventory (do this first every time)
```
ls src/routes/            # route → page mapping (TanStack file routes)
ls src/lib/               # business-logic helpers (store, rbac, calc, sync)
find src/components -name "*.tsx" | sort
```
Cross-check the route list against the **Role Matrix** sheet (routes each role
opens) and every `Prototype Route` cell on **Modules 1-8** / **E2E Flow**.

## B. Dead / unused code (the "remove unused function" job)
A file existing ≠ it being used. For each suspect component/helper, confirm it
is imported somewhere other than itself:
```
grep -rl "ComponentName" src --include=*.tsx --include=*.ts | grep -v "ComponentName.tsx"
```
No hits (other than its own file) ⇒ dead code ⇒ note it in **Build Plan** P0
backlog and the relevant gap cell. Known dead code as of the last pass:
- `/outlet/sales` route — unlinked AND blocked by `canAccessOutletPath`.
- `src/components/admin/AdminNotificationBell.tsx` — unused duplicate; only
  `src/components/portal/AdminNotificationBell.tsx` is imported (by `admin.tsx`).

Also watch the inverse — a "component was REMOVED" note that is now false
because the file is back / still imported (e.g. `OutletSealReview.tsx`, which
IS still used by `OutletShiftDetailPanel.tsx`).

## C. Load-bearing facts the workbook asserts (grep to confirm/refute)
| Workbook claim | Verify with | Last known truth |
|---|---|---|
| Geofence soft-fails (demo) | `grep -n DEMO_RELAX_CHECK_IN_GEOFENCE src/lib/pr-check-in-geofence.ts` | `= true` (soft-fail) |
| PV stops at SIGNED, no PAID cron | `grep -n "signPrPv\|SIGNED\|PAID" src/lib/store.ts` | `signPrPv` sets `SIGNED`; `PAID` only in seed |
| Welcome hardcodes pr_tied | `grep -n "pr_tied\|pr_free" src/routes/index.tsx` | `setPrSubRole("pr_tied")` |
| No Agency Analytics page | `ls src/routes/agency.analytics.tsx` | does not exist |
| No in-session Switch (sign-out only) | `grep -in "signOutToWelcome\|Switch" src/components/portal/PortalShell.tsx` | `signOutToWelcome` only |
| Weekly (not daily) reconciliation | `ls src/lib/reconciliation-weekly.ts` | weekly cycle |
| Tiered cancellation penalty (<2h = 50%) | `ls src/lib/pr-schedule-cancellation.ts` | implemented |
| Real PV .xlsx export | `grep -n "ExcelJS\|exceljs" src/lib/pv-pdf.ts` | ExcelJS styled template |
| Recommended PR carousel built | `ls src/components/outlet/RecommendedPRs.tsx` | exists |
| Cut-loss request flow | `ls src/lib/outlet-cutlost-requests.ts src/components/outlet/OutletCutLossActions.tsx` | exists |
| Drink self-log + delete | `ls src/components/pr/DrinkSelfLogMenu.tsx src/lib/outlet-drink-menu.ts` | exists |
| Demo OTP accepts any 6-digit | `grep -n "123456\|6" src/lib/verify-demo-otp.ts` | accepts 123456 or any 6-digit |
| Admin portal scope | `ls src/routes/admin*.tsx` | `admin.tsx` shell + `admin.jobs.tsx` + `admin.subscriptions.tsx` only |

## D. RBAC (RBAC Matrix + Role Matrix sheets)
The "Prototype Enforced" column and Role Matrix must match the permission
tables in code:
```
src/lib/agency-rbac.ts    # agency_owner / agency_finance perms + nav labels
src/lib/outlet-rbac.ts    # outlet_owner / outlet_finance / outlet_ops perms + canAccessOutletPath
src/lib/pr-demo.ts, src/lib/use-pr-sub-role.ts   # pr_tied / pr_free
```
Check nav **labels** here too (they drift): e.g. agency "Job Posting" (was
"Available Services"), outlet "Today" / "Calendar page" (was "Future
Operations").

## E. Snapshot counts
The **Overview** snapshot and the **E2E Flow** final SNAPSHOT row both state
`N Done · N Partial · N Missing`. If you flip any Status cell, recount the
E2E `F` column (Status) and update both totals so they stay consistent.

## F. Don't break
- **Audit Formula** sheet cells `F4:F7` are live formulas (`=B4-C4-D4-E4` …).
  Never overwrite them with plain values.
- Leave spec columns (Workflow, Under-the-Hood, Logic/Formula, Key Rules)
  untouched unless the product spec itself changed — this skill audits the
  *build*, not the *spec*.
