# InnocenZ Prototype → Sheet Sync Instructions

This file tells Claude Code exactly what to do when the user says something like
"sync the sheet with the current repo." Read this in full before acting.

## Source of truth

This repo (`InnocenZ-proto`) is the ONLY source of truth for this task.
Do not pull in anything from the old MVP blueprint Excel, old chat history, or
memory — only what's actually in the current HTML/JS files on disk right now.

## Target

- **Google Sheet:** https://docs.google.com/spreadsheets/d/1EUTqFCRu2Tcuocr4JZP93PtggtOsNpnBHyUKPJK02rs/edit
- **Tab name:** `Live Prototype Sync`

If this tab doesn't exist yet, create it. Never write into any other existing
tab in this spreadsheet — those hold the old blueprint and must stay untouched.

## Column schema (must match exactly, in this order)

1. **Role** — which role this screen/flow belongs to (PR Personnel, PR Agency,
   Outlet, UAB Admin). Infer from context/navigation if not explicit.
2. **Step-by-Step Workflow** — the sequence of user actions on this screen, in order.
3. **How the App Works** — plain-language description of what the screen/feature does.
4. **Logic Formula** — any calculation, condition, or rule visible in the code
   (e.g. commission math, validation, gating logic). Leave blank if none exists
   in the code — do not invent one.
5. **Input → Output** — what the user enters/taps, and what the system
   shows/produces as a result.
6. **Key Rules & Notes** — anything else worth flagging: hardcoded placeholder data,
   "Future" labels, broken links, missing states, inconsistencies between screens.

One row per distinct screen or major flow step — granular enough to be useful,
not so granular that every button gets its own row.

## Behavior on each run

1. Read every HTML/JS file in the repo (the live prototype).
2. Extract the current state into the schema above.
3. Clear the `Live Prototype Sync` tab completely, then write the fresh rows.
4. Add a small timestamp note in cell A1's neighboring area or a footer row:
   `Last synced: [date/time] from commit [short hash if available]`.
5. Report back to the user: how many rows written, and a short list of anything
   that looks unfinished, inconsistent, or marked "Future"/"WIP" in the code —
   these are worth flagging since they may be build-blocking decisions.

## What NOT to do

- Don't merge with old data in that tab — full overwrite only.
- Don't touch any other tab in the spreadsheet.
- Don't guess at business logic (commission %, payout rules, etc.) that isn't
  actually implemented in the code — flag it as missing instead of inventing one.
