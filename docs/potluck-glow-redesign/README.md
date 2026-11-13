# Potluck "Glow" redesign: implementation handoff

This folder is the complete handoff for the Glow redesign of Potluck's group page: the Activity ledger, the Balances tab, adding/editing an expense, expense details, and a "viewing as" member switcher. Everything was designed in light and dark, for desktop and phone.

It is written for a coding agent whose job is to **compare this design with the current codebase and produce an implementation plan**. It describes *what* to build and *why*, plus every value needed to build it. It does not prescribe file structure or component library choices; those depend on what already exists in the repo.

Design canvas (owner-only link, for the human): https://claude.ai/artifact/GdXRHVxkfNGTeaNJBKkxPe

> **Building this?** Start with [`PLAN.md`](./PLAN.md) (decisions, task list, how to coordinate, access and tools) and [`PROGRESS.md`](./PROGRESS.md) (status and session log). The spec below is what they point into. The build runs on the `glow` branch.

## Read in this order

| # | File | What's in it |
|---|---|---|
| 1 | `docs/01-screens.md` | Inventory of all 24 boards, then a top-to-bottom anatomy of every screen with sizes |
| 2 | `docs/02-design-tokens.md` | Colour roles (light and dark), type scale, radii, spacing, elevation, gradient, avatar palette, icons |
| 3 | `docs/03-components.md` | Every component: anatomy, variants, states, suggested props, accessibility |
| 4 | `docs/04-interactions.md` | Page layout model, right-hand panel states, phone sheets, keyboard shortcuts, viewer switching, validation, responsive rules |
| 5 | `docs/05-data-and-calculations.md` | How each number on screen is computed, mapped to the real Supabase schema, plus the schema gaps the design exposes |
| 6 | `docs/06-copy.md` | Every UI string, with the rules for dynamic text |
| 7 | `docs/07-gaps-and-open-questions.md` | What was not designed, inconsistencies between boards, and decisions still open |
| 8 | `docs/08-current-vs-new.md` | Side-by-side of today's UI (screenshots in `reference/current-ui/`) and the redesign, feature by feature |

## Folder map

```
README.md
index.html            gallery of all 24 renders (open in a browser)
docs/                 the spec (8 files, read in order)
screens/              24 PNG renders at 2x, numbered in reading order
  manifest.json       board id, platform, theme, viewport and file paths for each render
html/                 the same 24 boards as standalone HTML (open in any browser; inline styles = exact values)
source/               the original canvas files (.dc.html), unmodified
tokens/
  tokens.css          CSS custom properties, light + dark + prefers-color-scheme
  tokens.json         same values as JSON (generated from tokens.css)
fixtures/
  veld-2026.json      the sample group used in every mockup, shaped like the Supabase tables
  reference.mjs       reference implementation of every computed number (no deps; node 18+)
  expected.json       output of reference.mjs; matches the numbers drawn in the mockups
reference/current-ui/ screenshots of the app as it is today (activity, balances, add-expense steps, details)
```

`node fixtures/reference.mjs --check` re-derives every value and asserts it matches `expected.json`, that member nets sum to zero, and that each viewer's per-person chips sum to their net.

## Things to know before reading the mockups

- **The mockups are static.** Every board is plain HTML with inline styles. Use them as the visual source of truth for values (sizes, colours, spacing), not as code to copy. Rebuild with the project's components and the tokens in `tokens/`.
- **Canvas scaffolding is not part of the design.** In `source/*.dc.html`, the `<x-dc>`, `<helmet>`, `support.js` and `<script type="text/x-dc">` pieces belong to the design tool. The files in `html/` have them stripped.
- **The data is sample data, but it is consistent.** Every mockup uses one invented group, "Veld 2026" (6 members, 5 expenses, 2 payments). The member names and some expense names come from a real group, but the amounts and splits are made up. All numbers on every board are computed from `fixtures/veld-2026.json` and agree with each other.
- **"You" is whoever is selected in the viewer switcher.** Potluck has no accounts yet. Every mockup is drawn from Jacky's perspective except boards AC/AF (Stephen's). See docs/04, "Viewer model".
- **Terminology.** The design says *group* and *member*; the database calls them `ledgers` and `users`. The docs use the design words and give the table names where it matters.
- **The `canvas_id` on each board** (F, H, J … AF) is the label shown on the design canvas, so the human and the agent can refer to the same board.

## Scope at a glance

**Redesigned:** group header, Activity tab (hero balance card, share-of-spend card, search, filters, ledger table/list with per-viewer impact and running balance), Balances tab (stat tiles, settle-up plan with "Mark paid", per-person breakdown), add/edit expense (single form, four split modes, live validation), expense details, viewing-as switcher, light/dark themes, keyboard shortcuts.

**New behaviour the design introduces** (no equivalent today): per-viewer perspective, running balance column, per-person pairwise chips, share-of-spend bar, "Save and add another", Duplicate, Delete from details, "Mark paid" from the settle-up plan, "Shares" split mode (tab only), search, filters, a details/add/edit side panel on desktop instead of modals.

**Not designed** (needs decisions or a later round): Add payment panel, Shares split body, edit-mode differences, delete confirmation, empty/loading/error states, toasts, theme toggle placement, first-visit "who are you?" prompt, groups list. Full list in `docs/07-gaps-and-open-questions.md`.
