# Glow build progress

The running state of the Glow redesign. Every session that works a task from
[`PLAN.md`](./PLAN.md) updates this file in the same PR as its code.

- **Board:** current status of every task. Edit the row in place.
- **Open questions:** blockers waiting on the owner. The owner answers them in
  place; once resolved, the asking session's successor folds the answer into
  `PLAN.md` and deletes the question.
- **Spec corrections:** places where the spec turned out to be wrong.
  Append-only.
- **Log:** one entry per session, **newest first**. Append-only: never edit or
  delete another session's entry.

Read the board and the five newest log entries before starting work.

---

## Board

Statuses: `todo` · `in progress` (branch) · `in review` (PR link) · `done` · `blocked` (see Open questions)

| Task | Title | Depends on | Status | Branch / PR |
|---|---|---|---|---|
| T00a | Confirm decisions | | done | accepted as defaults, 2026-11-13 |
| T00b | Dev database, `glow` branch | | done | `glow` |
| T01 | Seed script | T00b | todo | |
| T02 | Tokens, font, theme plumbing | T00a | in review | PR pending (`claude/glow-t02-tokens-161184`) |
| T03 | Viewer calculation layer | T00a | todo | |
| T04 | Schema: split mode, weights, created_by | T00a | todo | |
| T05 | Foundation components | T02 | todo | |
| T06 | Viewer state, first-visit prompt | T03, T05 | todo | |
| T07 | Page frame, viewing-as switcher | T06 | todo | |
| T08 | Activity hero, share card | T07 | todo | |
| T09 | Ledger table and list | T07 | todo | |
| T10 | Search and filters | T08, T09 | todo | |
| T11 | Right panel, drawer, sheet | T07 | todo | |
| T12 | Expense details | T09, T11, T04 | todo | |
| T13 | Composer: shell, Equally | T11, T04, T05 | todo | |
| T14 | Composer: Exact, Percent, Shares, Edit | T13 | todo | |
| T15 | Payments: add, details, edit | T11, T09 | todo | |
| T16 | Balances tab | T07, T15 | todo | |
| T17 | Keyboard shortcuts | T10, T12, T14, T16 | todo | |
| T18 | States and edge cases | T16 | todo | |
| T19 | Accessibility and motion pass | T18 | todo | |
| T20 | Home and create-group restyle | T02 | todo | |
| T21 | Ship | all | todo | |

---

## Open questions

_None yet._ Format:

> **Q1 · T13 · 2026-11-20** What should happen when …? Options: (a) … (b) …
> I'd pick (a) because …
> **Answer:** _(owner)_

---

## Spec corrections

Places where `docs/01`–`08` turned out to be wrong or stale. Each entry says
which doc and section, what it says, and what's actually true. `PLAN.md`
"Spec facts that changed" lists the ones known when the plan was written.

_None yet._

---

## Log

### Template

```
### YYYY-MM-DD · T## · <model>
**Status:** done → in review (PR #N) | partial | blocked
**Changed:** files or areas touched, one line each.
**Checked:** npm test ✓ · lint ✓ · build ✓ · visual (boards NN, NN at 1280/390, light/dark) ✓ / not done (why)
**Differs from the boards:** what still looks different, or "nothing noticed".
**Decided:** anything the plan and spec didn't cover that you chose, and why.
**New copy:** strings not in docs/06, if any.
**Next session should know:** traps, half-finished edges, follow-ups.
```

Keep it short. Facts, not a narrative. If something wasn't checked, say so.

---

### 2026-11-13 · T02 · claude-sonnet-5-5
**Status:** done → in review (PR pending).
**Changed:**
- `src/app/tokens.css`: verbatim copy of `tokens/tokens.css`.
- `src/app/globals.css`: imports it, maps colour roles, shadows and radii with `@theme inline` (`bg-surface`, `text-text-muted`, `border-line`, `shadow-card`, `rounded-hero`, `bg-member-1-bg`, …), and puts the next/font variable first in `--font-sans`. Body uses `--bg` and `--text`.
- `src/app/layout.tsx`: Plus Jakarta Sans (variable font, weights 200–800) replaces Geist and Geist Mono. Adds the theme init script in `<head>` and `suppressHydrationWarning` on `<html>`.
- `src/lib/theme.ts` + `theme.test.ts`: `Theme` type, `getStoredTheme`, `setTheme`, `applyTheme`, `themeInitScript`. Storage key `potluck:theme`.
**Checked:** npm test ✓ (6 new tests) · build ✓ · lint ✗ (see below) · visual: home and the seeded Veld 2026 ledger page render in Plus Jakarta Sans. Boards not compared, because T02 changes no component.
- Lint has one error, `ExpenseModal.tsx:80` `set-state-in-effect`. It is KNOWN-ISSUES 5.2, was there before this task, and goes away when T14 removes `ExpenseModal`. T02's files lint clean.
- With the OS in light mode and nothing stored, `--bg` is `#f7f7fa`. With the OS in dark mode and nothing stored, it is `#0f0f1a`.
- Setting `data-theme` by hand to light, dark and system switches `--bg`, `--surface` and `color-scheme`. Dark: `#0F0F1A` / `#1C1C2E`. Light: `#F7F7FA` / `#FFF`.
- A stored `dark` beats a light OS after a reload, with no console errors.
- In the delivered HTML the init script comes before `<body>`, so the first paint uses the stored theme.
- Not checked: a frame-by-frame flash capture.
**Differs from the boards:** nothing to compare yet.
**Decided:**
- `data-theme` is written as `system`, `light` or `dark`. With nothing stored it is left unset. Both unset and `system` follow the OS in `tokens.css`.
- The font loads as the variable font (no `weight` list) because the docs recommend it. It gives 400–800 from one file set.
- The next/font variable is `--font-plus-jakarta`, so it doesn't collide with `--font-sans` from `tokens.css`.
- `tokens.css` is unedited. Typography sizes aren't mapped into `@theme`: they'd clash with Tailwind's `text-*` size namespace. Components use `text-[length:var(--text-hero)]` or arbitrary values until a later task needs a utility.
- `tw-check`, a throwaway page used to inspect the generated CSS, was deleted before commit.
**New copy:** none.
**Next session should know:**
- **Dark mode on old screens.** Existing pages hard-code light colours (`bg-white`, `zinc-*`). With the OS in dark mode, or after `setTheme("dark")`, body text becomes near-white. Form inputs inherit it, so on the old Add expense modal their text is hard to read on the white fields. Cards and headings keep their own colours. This goes away as T07–T16 and T20 restyle those screens. Check dark mode in `glow` previews only from T07 on.
- Tailwind writes `--shadow-card: var(--shadow-card)` into a layer, and the unlayered `tokens.css` values win over it. This is harmless; don't rename tokens to avoid it (comment in `globals.css`).
- The path alias is `@/src/...` in this repo, not `@/...`.
- T07 adds the System / Light / Dark control. It should call `setTheme()` and `getStoredTheme()` from `src/lib/theme.ts`. A theme change in another tab isn't synced yet.

### 2026-11-13 · T00b (finish) · claude-opus-5-5
**Status:** done.
**Changed:**
- Owner: put the dev URL and secret key in the main checkout's `.env.local` and in Vercel Preview. Vercel Production is unchanged.
- Agent: commented out the old production URL and the unused anon key in `.env.local`. With duplicate keys, the last one wins, so the file worked, but one wrong deletion would have pointed local runs at production.
**Checked:**
- `.env.local`, loaded through `@next/env` as the app loads it, resolves to the dev URL, and its secret key reads all five dev tables (200 responses, 0 rows).
- `npm run dev` in this worktree with the copied `.env.local`: the home page returns 200, and a missing ledger returns 404.
- Vercel: Preview `NEXT_PUBLIC_SUPABASE_URL` is the dev URL, and Production is still the production URL. The Preview secret key is sensitive and can't be read back, so it was checked live instead: a Preview deploy built after the change served `/ledger/<unknown id>`, and the dev project's edge log shows the request from Vercel (IAD) using a `sb_secret_` key and getting 406, which is PostgREST's "no rows" answer. A rejected key would get 401.
- Merged `main` (#10, #11) into `glow`, so `glow` has the lockdown migration in `supabase/migrations/`.
**Next session should know:** T01 is unblocked. Anything that runs the app hits the empty dev database until T01 seeds it.

### 2026-11-13 · T00b · claude-opus-5-5
**Status:** partial. The owner still has to put the secret key in place (see T00b in PLAN.md).
**Changed:**
- Created the Supabase project `potluck-dev` (ref `pooogudusmmfuztxaqfg`, ca-central-1, $0/month).
- Applied all 8 migrations, including `20261113204541_revoke_public_access` (still in `supabase/pending/` on `main` until PR #10 merges).
- Renumbered dev's migration history to the file versions.
- Cut `glow` from `claude/glow-build-plan`, so it already contains PLAN.md.
**Checked:** per-category schema fingerprints (columns, constraints, indexes,
function signatures, grants and ACLs, function bodies ignoring comments, RLS)
match production, with 0 policies on both.
**Next session should know:**
- The function bodies on dev have no comments; the logic is identical to production.
- Until `.env.local` points at dev, T01 and anything that runs the app is blocked.
- T02 and T03 can start now.

### 2026-11-13 · T00a · claude-opus-5-5
**Status:** done.
**Changed:** PLAN.md "Decisions". The owner accepted every recommended option
(D1–D22) as a default, to ship sooner. The status column became "Built in",
which maps each decision to the tasks that implement it, so changing one later
shows what to rework.
**Next session should know:** decisions are settled; don't ask about them.
T00b (dev database, `glow` branch) is still the owner's, and blocks any task
that runs the app or applies a migration. T02 and T03 can start without it.

### 2026-11-13 · plan · claude-opus-5-5
**Status:** PLAN.md and PROGRESS.md written. No code changed.
**Checked:** `node fixtures/reference.mjs --check` passes. Decisions D1–D22 were
proposed at this point (accepted in the T00a entry above). The dev database
doesn't exist yet.
**Decided:** an integration branch (`glow`) instead of a feature flag. Production
keeps the current UI until T21, and no task has to keep old and new UI working
side by side behind a switch.
**Next session should know:** nothing can start until the owner finishes
T00a and T00b.
