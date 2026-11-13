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
| T00b | Dev database, `glow` branch | | todo (owner) | |
| T01 | Seed script | T00b | todo | |
| T02 | Tokens, font, theme plumbing | T00a | todo | |
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
