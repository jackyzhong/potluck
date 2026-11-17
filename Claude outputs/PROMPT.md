You're picking up the Potluck app (https://github.com/jackyzhong/potluck), a Next.js + Supabase expense-splitting app. A UI redesign called "Glow" was built in round 1 on the `glow` branch, from 24 design boards. Round 2 covers the screens round 1 had no designs for, plus a new landing page. Your job in this session is to **plan** round 2, not to build it.

## Attached

`potluck-glow-round2.zip`, the round-2 handoff:
- `README.md`: inventory of all 66 boards, notes by area, the design rules, and 7 decisions the owner still has to make (B1–B7)
- `html/`: 66 standalone boards, light and dark, with exact values in inline styles
- `screens/`: the same boards as PNGs, plus `manifest.json` (board → code today → effort)
- `index.html`: a gallery of all boards

## Steps

1. Clone the repo, check out `origin/glow`, and cut a branch `glow/round2-plan` from it.
2. Unzip the attachment into `docs/potluck-glow-redesign/round-2/`. Commit it as-is as your first commit ("Add Glow round 2 design handoff").
3. Read, in this order:
   - `AGENTS.md` (this Next.js version has breaking changes; read `node_modules/next/dist/docs/` before relying on any Next API)
   - `docs/potluck-glow-redesign/README.md`, `PLAN.md` and `PROGRESS.md`: round 1's handoff, task procedures and log. Round 2 follows the same procedures.
   - `docs/potluck-glow-redesign/docs/02-design-tokens.md`, `03-components.md` and `06-copy.md`
   - `docs/potluck-glow-redesign/round-2/README.md`, then look at every PNG in `round-2/screens/` (open the matching `html/` file when you need an exact value)
4. Audit the code. For every row in the round-2 inventory, open the component listed under "Code today" and confirm what it does now. The "Code today" column came from a quick read; correct it where it's wrong.
5. Write the plan into `docs/potluck-glow-redesign/round-2/PLAN.md`, in the style of round 1's `PLAN.md`:
   - Tasks numbered from T22, each small enough for one session. Each task needs: goal, boards, files to touch, dependencies, schema or server changes, and a "Done when" checklist that includes comparing against the boards in both themes at the board sizes.
   - Mark which tasks depend on an owner decision (B1–B7) and which can start now.
   - Put the schema and server work first (members at creation needs `createLedger` and probably a SQL function). Shared pieces go before the screens that use them: the inline confirm strip, the toast with an action, `not-found`/`error`.
   - Add a round-2 board to `PROGRESS.md` (new table under round 1's) with every task as `todo`.
6. Commit, push, and open a **draft** PR into `glow` titled "Glow round 2: handoff and plan".
7. Reply with: the task list (one line each), the decisions you need from me, ordered by what they block, and anything in the boards that contradicts the code or round 1's decisions.

## Rules

- Don't write feature code or migrations in this session. Plan only.
- Don't touch production (Supabase or Vercel), and don't merge anything.
- Where the boards and round 1's decisions conflict (for example Undo toasts against D14/D15, or the inline discard strip against the current dialog), list it as a question. Don't pick a side.
- Use the existing `src/components/glow/` components and token utilities in the plan. Don't propose a new component library or new tokens.
- If something blocks you, write it under "Open questions" in `PROGRESS.md` and stop rather than guess.
