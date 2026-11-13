# Glow build plan

How the Glow redesign gets built, one small task per session. This file says
**what to do and in what order**. The spec in `docs/01`–`08` says **what it
should look like and compute**. [`PROGRESS.md`](./PROGRESS.md) says **where
the work stands**.

First written 2026-11-13, from `main` at `7b98618`. This file holds the
plan and the procedures. It never holds the current state: that's
`PROGRESS.md`, and git (`origin/glow`). Change this file when a decision,
a task's scope or a procedure changes, and say so in the PROGRESS log.

**Start here.** Everything needed to continue the build is in this folder;
no chat history is required. Two roles, in any harness or model:

- **Task worker:** asked to do one task (e.g. "do T08"). Read
  "How to work a task", then "Rules for every task", "Local setup",
  "Access and tools", and your task's section.
- **Coordinator:** asked to "continue the Glow build", or to pick the work
  back up after a break. Read "Coordinating the build". It covers finding
  the state, dispatching tasks, reviewing them, and merging into `glow`.

---

## How to work a task

1. **Read [`PROGRESS.md`](./PROGRESS.md) first.** Take the first task in the
   board whose status is `todo` and whose dependencies are all `done`. Don't
   start a task another session has `in progress`.
2. **Mark it claimed, on your own branch.** Cut your task branch from
   `origin/glow` and set the task's status to `in progress` with your branch
   name. Commit just that change and push the branch. Don't push board edits
   straight to `glow`: until your PR merges, you own your task's row, and
   only on your branch.
3. **Read only what the task lists**, plus "Rules for every task" below. The
   spec is about 14k words; a task needs a few sections of it, not all of it.
4. **Build it.** Stay inside the files the task names. If you have to touch
   something else, say why in your log entry.
5. **Check every "Done when" item.** If you can't check one (no browser, no
   dev database), say so in the log. Never report something as checked when
   it wasn't.
6. **Update `PROGRESS.md` in the same PR:**
   - Set the task's status to `in review` with the PR link.
   - Add a log entry using the template there.
   - Add anything you found wrong in the spec under "Spec corrections".
7. **Open a PR into `glow`** (not `main`). One task per PR.

If something blocks you (a decision this plan doesn't cover, a test you can't
make pass, or a spec contradiction you can't settle from this file), stop.
Write it under "Open questions" in `PROGRESS.md` and end the session; don't
guess. A guess made in one session gets undone in the next.

### Branches

- `glow` is the integration branch, cut from `main`. Every task PR targets it,
  so production stays on the current UI until the whole redesign is ready.
- Task branches are cut from the latest `origin/glow`. Prefer
  `glow/T07-page-frame`. A harness that adds its own prefix
  (`claude/glow-t07-…`) is fine, as long as the task id is in the name.
- When the board is all `done`, `glow` merges to `main` in one PR (task T21).
- If `main` moves (realtime, fixes), merge `main` into `glow`; never rebase
  `glow`.

---

## Coordinating the build

The coordinator keeps the build moving across sessions. It works out where
things stand, hands tasks to workers (other sessions, other models or other
harnesses), reviews their PRs, and merges them into `glow`. It writes little
product code itself. Any model or harness can coordinate; a strong model is
worth it here, because review is where mistakes get caught.

Nothing about the build may live only in a chat. If it matters, it goes in
this file, `PROGRESS.md`, a commit, or a PR.

### 1. Find the state (every time you start)

```bash
git fetch origin
git log --oneline -5 origin/glow
git log --oneline origin/glow..origin/main   # main moved? merge it into glow (see Branches)
gh pr list --base glow --state open          # task PRs waiting for review
git branch -r | grep -i glow                 # task branches, including abandoned ones
```

Then read `PROGRESS.md`:

- **Board:** what is `done`, `in review`, `in progress` or `blocked`.
- **Open questions:** anything the owner has answered gets folded into this
  file. Delete the question and note it in the log.
- **The five newest log entries:** especially "Next session should know".

**Reconcile what you find:**

- **A task branch with no PR, and no worker still running.** In-flight work
  shows up as branches and PRs, not on `glow`'s board, because workers claim
  on their own branches. If the branch has useful commits, a new worker
  continues from it (say so in the brief). If not, ignore it, and delete it
  once you're sure it's dead.
- **`in review`:** review it (step 4).
- **A PR open into `glow` that the board doesn't mention:** review it anyway,
  and fix the board.

**Check the baseline is green** on `glow` before handing anything out:

```bash
git checkout glow && git pull --ff-only
cp "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .env.local   # if missing
node scripts/check-dev-env.mjs        # must pass before anything touches the database
npm test && npm run lint && npm run build
```

If `git checkout glow` fails because `glow` is checked out in another
worktree, run these in that worktree instead (`git worktree list` shows
where). Or use a throwaway checkout:
`git worktree add ../glow-coord glow`.

If it's red, fix that first, as its own small commit on `glow` with a log
entry. A check that was already failing makes every worker report a failure
you can't tell apart from a real one.

### 2. Pick what to hand out

**Ready** means `todo` with every dependency `done` (see the board and
"Order at a glance").

Run up to three or four at once, and never more than you can review. Don't
run two tasks together if they would collide on any of these:

| Shared thing | Tasks that touch it | What to do |
|---|---|---|
| `src/app/ledger/[id]/page.tsx` | T07, T08, T09, T10, T11 | Run in sequence, or tell each brief to keep its page edit to a few lines |
| `src/lib/validation.ts`, `actions.ts` | T04, T12, T13, T14, T15 | Run in sequence |
| `src/app/globals.css`, `tokens.css` | T02, T05, T20 | Neither T05 nor T20 should need them. If one must (e.g. to map type sizes as utilities), say so in its brief, and keep the other off them |
| `src/components/glow/` | T05, then most UI tasks add files | Fine together: one component per file. Two tasks changing the same existing component run in sequence |
| `src/app/dev/glow/page.tsx` (the component gallery) | T05, and any task that adds a component to it | Fine together if each adds its own section. Expect a small conflict at the end of the file, resolved by keeping both |
| The dev database | T01, T04, any task that saves through the UI | Tell each brief to test in its own throwaway group, delete it after, and leave the "Veld 2026" group alone |
| `PROGRESS.md` | every task | Expected. Resolve on merge (step 5) |

**Model choice:**
- The well-specified, testable tasks run well on a cheaper mid-tier model
  (e.g. Claude Sonnet): T01, T03,
  T04, T05, T06, T09, T10, T15, T17 and T18.
- The tasks that need judgement against the boards will come back with
  visual gaps, so budget a review pass for them: T07, T08, T11, T13, T14,
  T16 and T19.

### 3. Write the brief

Each worker starts cold. Give it the template below, filled in, plus a short
background paragraph. The task details already live in this file, so the
brief points to them rather than repeating them.

> **Background:** Potluck (Next.js 16 with breaking changes, React 19,
> Tailwind v4, Supabase, Vercel) is being redesigned ("Glow"). The build is
> split into tasks in `docs/potluck-glow-redesign/PLAN.md`, tracked in
> `PROGRESS.md`. Decisions D1–D22 are settled; don't ask about them. Task PRs
> go into the `glow` branch, never `main`. Running in parallel right now:
> *{other tasks and what they touch}*. Production Supabase (ref
> `xjkvjfmdljdpynlumszz`) must never be touched.
>
> **Brief:** Do task **T## (*title*)** from
> `docs/potluck-glow-redesign/PLAN.md`, and only that task.
> 1. Read `AGENTS.md`. Then read these PLAN.md sections: "How to work a
>    task", "Rules for every task", "Local setup", "Access and tools",
>    decisions *{the D# the task names, if any}*, and the T## section,
>    including its boards in `screens/` *{or: no boards}*. Read the
>    PROGRESS.md board and newest log entries, then the files T## lists.
> 2. Work on a branch cut from the latest `origin/glow`. Copy `.env.local`
>    per "Local setup", and run `node scripts/check-dev-env.mjs` before
>    anything touches the database. Claim the task on your branch ("How to
>    work a task", step 2).
> 3. Build what T## lists. *{Task-specific notes: collisions from the table
>    above, relevant "Next session should know" items, where to resume if
>    an earlier branch exists.}*
> 4. Check every "Done when" item. `npm test`, `npm run lint` and
>    `npm run build` must all pass.
> 5. In PROGRESS.md, edit only the T## board row, and add your log entry at
>    the top of the Log. Commit, push, and open a ready-for-review PR into
>    `glow` (`gh pr create --base glow`).
>
> If you hit a decision the plan doesn't settle, add an Open question in
> PROGRESS.md and stop rather than guess.

Don't edit a task's board row on `glow` while it's open. The worker owns
it on its branch, and two edits to one row make the merge conflict
unresolvable by script. You change it once, after merging (step 5).

### 4. Review each PR

Read the diff, not just the worker's summary. A summary is a claim, not
evidence. Check:

- **Scope:** the base is `glow`, and the diff stays inside the task's files.
  Anything outside them is explained in the log entry.
- **Done when:** every item has evidence in the log entry. Re-check the
  riskiest one yourself (re-run a test, open the page, query dev).
- **Checks:** test, lint and build pass on the branch. Run them yourself if
  in doubt.
- **Money:** integer cents everywhere, and cents conserved (splits sum to
  the total). Calculations come from `src/lib/glow/`; components don't
  re-derive them.
- **Data access:** no Supabase client in the browser. Every write goes
  through a server action that validates input and is scoped to the ledger
  (see "Rules for every task").
- **UI:**
  - Token utilities only, never raw hex. Copy comes from docs/06.
  - Open it at 1280 and 390 wide, in light and dark, and compare with the
    task's boards in `screens/`. This is where cheaper models fall short
    most.
- **Database tasks:**
  - The migration file's version equals the version recorded on dev.
  - Production's migration list is unchanged.
  - The worker's throwaway data is gone.
- **The worker's notes:** any new "Spec corrections" or "Open questions"
  entries have been read and handled.

**If a PR falls short:**
- **Small fixes:** push them to the PR branch yourself.
- **Anything bigger:** send it back with specific notes. Message the worker's
  session if it's still around, or start a new worker on the same branch
  with the notes in its brief.
- **If the plan or brief misled the worker:** fix this file too, so the next
  task doesn't repeat the mistake.

### 5. Merge into `glow`

Merge locally, one PR at a time. GitHub marks each PR merged once its
commits are on `glow`.

```bash
git checkout glow && git pull --ff-only
git merge --no-ff origin/<task-branch> -m "Merge <task-branch> into glow"
# If only PROGRESS.md conflicts (the usual case):
python3 scripts/resolve-progress-conflicts.py docs/potluck-glow-redesign/PROGRESS.md
git add docs/potluck-glow-redesign/PROGRESS.md && git commit --no-edit
```

The script keeps both sides of each conflict. For a board row, it takes the
side that moved the task off `todo`. For log entries, it keeps both, newest
first. It refuses if both sides changed the same board row; resolve that by
hand. A conflict in any other file means two tasks overlapped: resolve it by
hand, and say how in your log entry.

After the last merge of the batch:

```bash
npm test && npm run lint && npm run build     # on the merged result
```

Then, in `PROGRESS.md`:
- Set each merged task to `done` with `[PR #N](link)`.
- Add a coordinator entry at the top of the log, using the coordinator
  template in PROGRESS.md (`### YYYY-MM-DD · review T## · <model>`).
  Record:
  - what you merged;
  - what you fixed or sent back;
  - what you checked yourself;
  - what's now unblocked.

Commit, then `git push origin glow`. The `glow` Preview redeploys in about
a minute (see "Access and tools").

### 6. Before you stop

- Everything is committed and pushed. No work only in a local checkout, no
  state only in a chat.
- The board is true: every `in progress` row has a live branch or session.
  Anything abandoned goes back to `todo`, with a log note on where its
  branch stands.
- Your log entry says what's next, and what's waiting on the owner.

### What only the owner does

Ask; don't do these yourself:

- **Production:**
  - anything against the production database;
  - Vercel's Production environment;
  - merging `glow` into `main` (T21).
- **Secrets:**
  - changing Vercel environment variables;
  - creating or rotating Supabase keys;
  - handing secrets to a cloud harness.
- **Product calls:**
  - changing a decision D1–D22;
  - answering Open questions.
- **Irreversible or paid:**
  - deleting projects or branches other than finished task branches;
  - anything that costs money.

---

## Rules for every task

**Next.js.** This project runs Next.js 16 with breaking changes from what you
know (see AGENTS.md). Before writing Next-specific code, read the doc for the
API you're about to use, under `node_modules/next/dist/docs/01-app/`. The ones
this redesign needs:

| You're doing | Read |
|---|---|
| Server/client component boundary | `01-getting-started/05-server-and-client-components.md` |
| Calling a server action, forms, pending state | `01-getting-started/07-mutating-data.md`, `02-guides/forms.md` |
| Refreshing after a write | `03-api-reference/04-functions/refresh.md` (server side), `use-router.md` (client side) |
| `?tab=` / `?e=` / `?panel=` state | `03-api-reference/04-functions/use-search-params.md` |
| Fonts | `01-getting-started/13-fonts.md`, `03-api-reference/02-components/font.md` |
| Loading skeletons | `03-api-reference/03-file-conventions/loading.md` |

Page `params` and `searchParams` are Promises (see `src/app/ledger/[id]/page.tsx`).

**Data access.** The browser never talks to Supabase. The public key has no
table access at all.
- Reads happen in the server component `src/app/ledger/[id]/page.tsx`.
- Writes go through the server actions in `src/app/ledger/[id]/actions.ts`.
  Each one parses its input with `src/lib/validation.ts` and scopes every row
  to `ledgerId`. A new write follows the same pattern: validate first, scope to
  the ledger, `.select()` the result, and return an `ActionResult`.
- Never import `src/lib/server/supabase.ts` from a client component. The build
  fails if you do.
- After a write, call `router.refresh()` in the client, as the app does today.
  Everything on screen recomputes from the refreshed data.

**Calculations.** Viewer-relative numbers come from the pure functions in
`src/lib/glow/` (built in T03). Components never do money arithmetic inline.
Money is integer cents end to end and is formatted only at render, through
`<Money>`.

**Styling.**
- Tailwind v4 classes backed by the Glow tokens (set up in T02).
- Use semantic token names only. No raw hex, no Tailwind palette colours
  (`zinc-500` and similar) in new code.
- Light and dark come from tokens. Don't write `dark:` variants by hand.
- Pixel values (sizes, radii, padding) come from `docs/01-screens.md`, or from
  the inline styles in `html/NN-*.html` when the doc is vague. The HTML files
  are the exact source of truth for values.

**Copy.** Every user-visible string comes from `docs/06-copy.md`. If a string
you need isn't there, write it in the same voice and list it in your log entry.

**Components.**
- New components live in `src/components/glow/`, one per file, named as in
  `docs/03-components.md`.
- Don't add npm dependencies. If a task truly needs one, stop and ask in
  "Open questions".

**Accessibility.**
- Follow each component's accessibility notes in `docs/03`.
- Touch targets are at least 44px.
- Every interactive element is reachable and usable by keyboard.

**Tests and checks.** Before opening a PR, all three must pass:

```
npm test
npm run lint
npm run build
```

Logic goes in `src/lib/**` with a `*.test.ts` beside it. The test runner is
Node's built-in one: `node --test`, with type stripping and no test
libraries. See `src/lib/balances.test.ts` for the style.

**Visual check.** Any task that changes what's on screen has to be compared
against its boards:
1. Run `npm run dev` against the **dev** database (see "Local setup").
2. Open the seeded "Veld 2026" group and screenshot at 1280 wide and 390 wide,
   in light and in dark.
3. Compare each screenshot with the PNGs in `screens/`, and list in your log
   entry what still differs.

If your session has no browser tool, write "visual check not done" in the log.

**Never touch production.** Don't run migrations, seed scripts or test writes
against the production Supabase project. Schema changes are migration files
plus an apply to the **dev** project. The owner applies them to production
when `glow` ships (T21).

---

## Local setup

`.env.local` is not committed, and worktrees don't get a copy. In a new
worktree, copy the main checkout's file:

```bash
cp "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .env.local
```

That file must point at the **dev** Supabase project:

| Project | Ref | Use |
|---|---|---|
| `potluck-dev` | `pooogudusmmfuztxaqfg` | Local dev, seeding, migrations under test, Vercel Preview |
| `Potluck` (production) | `xjkvjfmdljdpynlumszz` | Production only. Never run the app, a seed or a migration against it from a task |

Then run `node scripts/check-dev-env.mjs`. It loads `.env.local` the way
the app does, and confirms both that it points at the dev project and that
the key works there. It never prints the key. If it fails, stop: don't run
the app, a seed or a migration.

The dev project has every migration in `supabase/migrations/` applied, its
migration history uses the same version numbers as the files, and its schema
was checked against production on 2026-11-13. When a task adds a migration,
apply it to dev under the file's version and note it in the log.

Seed the sample group with `node scripts/seed-dev.mjs` (built in T01). It
prints the group's URL.

---

## Access and tools

What the build touches outside the repo, and how to reach each thing from
any harness. Where something needs the owner, it says so.

### GitHub

- **Repo:** `jackyzhong/potluck`. Integration branch `glow`, production
  branch `main`.
- **Pushing:** needs git credentials.
- **PRs:** open with the `gh` CLI (`gh pr create --base glow`), or on the
  web at `https://github.com/jackyzhong/potluck/compare/glow...<branch>`.
- **CI:** Vercel builds a Preview for every pushed branch. There is no other
  CI, so test and lint run locally.

### Environment variables

- **Where they live:** `.env.local` in the main checkout
  (`/Users/jackyzhong/Desktop/Potluck/.env.local` on the owner's Mac). It is
  never committed. Worktrees copy it (see "Local setup").
- **What it holds:**
  - `NEXT_PUBLIC_SUPABASE_URL`, the dev project's URL;
  - `SUPABASE_SECRET_KEY`, the dev project's secret key;
  - commented-out production lines. Leave them commented.
- **Never** print, log or commit the secret key. To check a key works,
  load it in a script and print only pass/fail. Don't echo it.
- **A cloud or remote harness** has no copy. The owner must provide these
  two values as that harness's secrets. Ask; don't work around it.

### Supabase

| Project | Ref | URL |
|---|---|---|
| `potluck-dev` | `pooogudusmmfuztxaqfg` | `https://pooogudusmmfuztxaqfg.supabase.co` |
| `Potluck` (production) | `xjkvjfmdljdpynlumszz` | Never from a task |

**Reading dev data:**
- The app and scripts use the secret key through supabase-js.
- Ad-hoc SQL needs an SQL tool: a Supabase MCP connector with `execute_sql`,
  the dashboard's SQL editor, or `psql` with the dev connection string (the
  owner gets it from Project Settings → Database).

**Applying a migration to dev.** Use whichever of these you have. The
version recorded on dev must equal the file's prefix
(`supabase/migrations/<version>_<name>.sql`). The `name` recorded is the
rest of the filename, without `.sql`. `statements` is a `text[]` and may be
empty (`'{}'`). If you have none of these, write the migration, commit it,
and ask the owner to apply it. Say so in the log, and leave every "applied
to dev" item unchecked.

1. **A Supabase MCP connector** (`apply_migration` on the dev project). It
   stamps its own timestamp, so fix the version afterwards:
   ```sql
   update supabase_migrations.schema_migrations
      set version = '<file version>' where version = '<stamped version>';
   ```
2. **The dashboard SQL editor** (owner signs in). Paste the file and run it.
   Then record it:
   ```sql
   insert into supabase_migrations.schema_migrations (version, name, statements)
   values ('<file version>', '<name>', '{}');
   ```
3. **`psql` with the dev connection string**, which the owner provides:
   `psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql`,
   then the same `insert` as option 2.
4. **The Supabase CLI.** It isn't installed and there's no `config.toml`. It
   needs the owner's access token and the dev database password:
   ```bash
   npx supabase@latest link --project-ref pooogudusmmfuztxaqfg
   npx supabase@latest db push
   ```
   It applies only the files missing from dev's history.

**Check:**
```sql
select version, name from supabase_migrations.schema_migrations order by version;
```
Run it on dev; the new version should be last. Production's list must not
change until T21. If you can read production's history read-only, confirm
that. Otherwise say in the log that you couldn't.

**Seeded data:**
- `node scripts/seed-dev.mjs` (re)creates "Veld 2026" at a fixed id:
  `/ledger/3894c472-c5d9-5a84-ad89-8f6aa3ea2361`.
- It refuses to run against any host but dev.

### Vercel

- **Project:** `potluck`, under the `jackyzhongs-projects` team.
- **Environment variables:** separate per environment.
  - **Production** → production database.
  - **Preview** → dev database.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still set but unused.
- **Previews:**
  - Every pushed branch gets one.
  - `glow` always lives at `https://potluck-git-glow-jackyzhongs-projects.vercel.app`.
  - Each PR links its own Preview.
  - Previews sit behind Vercel login (Deployment Protection), so a harness
    without the owner's Vercel access can't open them. Use `npm run dev`
    locally instead.
- **Env var changes** take effect only on the next deploy. Push a commit or
  redeploy.

### Checking what you can't run

If your harness lacks a tool (no browser, no SQL access, no Vercel access),
do the rest of the task. In the log, name each "Done when" item you
couldn't check and why. The coordinator or owner checks it before merging.
Never mark an unchecked item as checked.

---

## Decisions

The spec leaves these open (docs/07 §B and §C). Each one is settled here so
sessions don't each guess differently.

**All accepted as defaults on 2026-11-13.** The owner chose to ship with the
recommended option for every decision rather than debate each one up front.
They are working choices, not final product calls, and any of them can be
revisited later.

**To change a decision:**
1. Edit its row here.
2. Add a log entry in `PROGRESS.md` saying what changed and why.
3. Look at "Built in": if those tasks are already `done`, add a follow-up
   task for the rework instead of editing a finished task's scope.

Building to a decision is not a reason to stop and ask. Only a situation no
decision covers is.

| # | Question | Decision | Built in |
|---|---|---|---|
| D1 | Hero chips (pairwise) vs. the simplified plan can disagree (07 B1) | Activity shows pairwise; Balances shows the simplified plan with the caption "Simplified: fewer payments, same totals" | T08, T16 |
| D2 | "Don't lose the link" warning vs. Invite (07 B2) | Invite opens a popover with Copy link plus the reminder text. The first-visit prompt also mentions bookmarking | T07 |
| D3 | First-visit "Which one are you?" prompt (07 B3) | Build it. Until someone picks, use neutral wording (no "you") | T06 |
| D4 | Theme control (07 B4) | Follow the system by default. Add System / Light / Dark to the viewing-as menu, saved per device | T02, T07 |
| D5 | Equal-split remainder (07 B5) | The first members in ledger order take the extra cents. This is already the app's rule; keep it | T03 |
| D6 | Percent rounding: the spec uses largest remainder, the app gives the leftover to the last person | Use largest remainder (`splitByWeight` in `fixtures/reference.mjs`) for Percent and Shares. It only affects new saves | T03, T14 |
| D7 | Date vs. date-time (07 B6) | Date picker, still written to `expenses.created_at`. "Today" uses the current time; any other day uses local noon. No new column | T13 |
| D8 | Multi-currency (07 B7) | Out of scope. The currency pill works as today's select does. No conversion work | T13 |
| D9 | Signed-in "view as" (07 B8) | Not applicable yet. Keep the viewer behind `useViewer()` so accounts can replace it later | T06 |
| D10 | "Trip so far" title (07 B9) | "So far" | T08 |
| D11 | Zero-value chips (07 B10) | Hide members who are square with the viewer | T08 |
| D12 | "Added by" in details (05 gap 2) | Add `expenses.created_by` (nullable), set from the viewer at save. Older rows show no "added by" | T04, T12, T13 |
| D13 | Reopening the split mode on edit (05 gap 1, KNOWN-ISSUES 1.2) | Add `expenses.split_mode` and `splits.weight`. Old rows (no mode) open in Exact | T04, T12, T14 |
| D14 | Delete confirmation and Undo (07 C) | Delete asks first, inline in the panel: "Delete this expense? This can't be undone." No Undo on delete | T12 |
| D15 | Toasts (07 C) | One polite toast for success messages, no Undo in this round. Errors show inline, replacing every `alert()` | T18 (and every task with a write) |
| D16 | Add payment panel (07 C) | Use the composer shell: "From [●] to [●]", amount on the gradient card, date, note, Save. Mark paid opens it prefilled | T15, T16 |
| D17 | Shares split body (07 C) | Integer steppers per member, default 1, minimum 0 | T14 |
| D18 | URL shape (04 suggests `/g/[id]`) | Keep `/ledger/[id]`. Add `?tab=`, `?e=` (selected expense) and `?panel=add` | T11 |
| D19 | Phone back button (no groups list exists) | Leave it out for now | T07 |
| D20 | Phone search and filters | Not in this round (desktop and tablet only) | T10 |
| D21 | Keyboard shortcuts | Build the full table in docs/04. The spec says some already exist; only Escape does | T17 |
| D22 | Home page and create-group page | Out of scope, apart from picking up the new font and tokens (T20) | T20 |

---

## Spec facts that changed after it was written

The spec was written against the code before PRs #7 and #8. Where it
disagrees with what's below, this list wins:

- **Deletes already exist.** `deleteExpense` and `deletePayment` are in
  `actions.ts`, so 05 gap 5 is done.
- **Saving already happens in one transaction.** `saveExpense` calls the
  `save_expense()` database function. Extend it; don't add a second save path.
- **Archived members exist.** `users.archived_at` is in the schema, and
  `src/lib/members.ts` has `activeMembers()` and `pickableMembers()`. Use them
  for pickers and default participants (05 gap 8).
- **`users.device_token` is unused** (KNOWN-ISSUES §6). The viewer lives in
  `localStorage` only (05 gap 7).
- **The settle-up algorithms** are `getSimplifiedDebts` and
  `getUnsimplifiedDebts` in `src/lib/balances.ts`. The per-member breakdown is
  `getMemberBreakdown`. Reuse them; don't port the reference's versions.
- **RLS:** the public key can read nothing (see "Data access" above).

---

## Tasks

Size: **S** is under an hour, **M** is a few hours, **L** is most of a session.
"Review" marks the tasks where the logic is subtle enough that the owner
should read the diff closely, or run the task on a stronger model.

### Phase 0: owner, before any build task

**T00a · Confirm the decisions.** Done 2026-11-13: the owner accepted every
recommended option as a default (see "Decisions").

**T00b · Dev database.** Done 2026-11-13.
- Created the `potluck-dev` project, $0/month.
- Applied all migrations to it and checked its schema matches production.
- Cut the `glow` branch.
- The main checkout's `.env.local` points at the dev project. Its old
  production lines are commented out, not deleted.
- Vercel holds separate variables per environment. **Production** keeps
  `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` for the production
  project. **Preview** has its own pair for the dev project, so `glow`
  previews never write to real groups. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
  still set but unused.

### Phase 1: foundations (T01–T04 can run in parallel)

**T01 · Seed script** · S · depends on T00b
- **Build:** `scripts/seed-dev.mjs`, which loads `fixtures/veld-2026.json` into
  the database named in `.env.local` and prints the group's URL.
  - It refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` contains the dev
    ref `pooogudusmmfuztxaqfg`. Use an allow-list, not a block on the
    production ref.
  - It's idempotent: re-running replaces the Veld group instead of adding a
    second one.
- **Read:** `fixtures/veld-2026.json`, `supabase/migrations/`, README "Folder map".
- **Done when:** the printed URL opens in today's UI and shows 5 expenses and
  2 payments. Running it twice still leaves one Veld group.

**T02 · Tokens, font, theme plumbing** · M · depends on T00a
- **Build:**
  - Bring in `tokens/tokens.css` (copy it into `src/app/`, not a cross-folder
    import) and map the roles into Tailwind v4 with `@theme inline` in
    `globals.css`, e.g. `--color-surface: var(--surface)`.
  - Swap Geist for Plus Jakarta Sans via `next/font/google` in
    `src/app/layout.tsx`.
  - Add `src/lib/theme.ts`: read and write the stored theme (D4) and set
    `data-theme` on `<html>`, with an inline script so the page doesn't flash
    the wrong theme on load.
- **Read:** `docs/02-design-tokens.md`, `tokens/tokens.css`, and the CSS and
  fonts Next docs.
- **Done when:**
  - Existing pages still render.
  - Setting `data-theme="dark"` by hand switches `--bg` and `--surface`.
  - With no setting stored, the theme follows the OS.
  - `npm run build` passes.

**T03 · Viewer calculation layer** · M · Review · depends on T00a
- **Build:** `src/lib/glow/`, a TypeScript port of `fixtures/reference.mjs`:
  - `splitEqually`, `splitByWeight` (D6), `impact`, `viewerLedger` (impact
    and running balance per row), `pairwise`, `shareOfSpend`, `memberTotals`,
    the composer impact line, and the hero sub-line counts.
  - The types take the app's row types (`Expense`, `Split`, `Payment` from
    `page.tsx` and `balances.ts`), not the fixture's shape. A small adapter in
    the test turns the fixture into those types.
- **Read:** `docs/05-data-and-calculations.md` (all of it),
  `fixtures/reference.mjs`, `fixtures/expected.json`, `src/lib/balances.ts`.
- **Done when:**
  - `src/lib/glow/*.test.ts` asserts every value in `expected.json`, for both
    Jacky and Stephen.
  - It also has property tests in the style of `balances.test.ts`: nets sum to
    0, chips sum to the viewer's net, the newest row's running balance equals
    the net, and every split mode's cents sum to the total.
  - `npm test` passes.

**T04 · Schema: split mode, weights, created_by** · M · Review · depends on T00a
- **Build:**
  - A migration adding:
    - `expenses.split_mode text null check (split_mode in ('equal','exact','percent','shares'))`
    - `splits.weight numeric null`
    - `expenses.created_by uuid null references users(id)`
  - Extend `save_expense()` to take and store all three, still checking that
    `created_by` belongs to the ledger.
  - Extend `parseExpenseInput` and `saveExpense` to match.
  - The current `ExpenseModal` keeps working: it sends no mode, which is stored
    as null.
- **Read:** 05 "Gaps" rows 1–2, `supabase/migrations/20261105233937_save_expense_function.sql`,
  `src/lib/validation.ts`, `actions.ts`.
- **Done when:**
  - Validation tests cover the new fields: a bad mode is rejected, a weight is
    required for percent and shares, and a foreign `created_by` is rejected.
  - The migration applies cleanly to the dev project, and today's UI still
    saves an expense against it.
  - The migration is **not** applied to production.

### Phase 2: building blocks

**T05 · Foundation components** · M · depends on T02
- **Build:** in `src/components/glow/`:
  - `Avatar` (palette from docs/02 "Member avatar palette", colour derived
    from the member's position in ledger order, archived members included,
    so nobody's colour changes when someone else is archived)
  - `Money`, `Kbd`, `Button`, `SegmentedControl`, `FilterChips`,
    `SearchField`, `Switch`, `StatusStrip`, `Toast`
  - `Toast` is the presentational component only (look, variants, a11y
    role). Wiring it into saves and errors is T18 (D15).
  - a component gallery, `src/app/dev/glow/page.tsx`, showing every
    variant. It calls `notFound()` only when
    `process.env.VERCEL_ENV === "production"`. Vercel Preview builds also run
    with `NODE_ENV=production`, so gating on `NODE_ENV` would hide it on the
    `glow` Preview, where the owner looks at the work.
- **Read:** `docs/03-components.md` "Foundations", `docs/02`.
- **Done when:**
  - The preview page shows every variant in light and dark.
  - `Money` renders a real minus sign (U+2212) and tabular numerals.
  - Unit tests cover `Money`'s formatting function.

**T06 · Viewer state and first-visit prompt** · M · depends on T03, T05
- **Build:**
  - `useViewer()` plus a provider: `localStorage` key
    `potluck:viewer:{ledgerId}`, with the fallback rules from docs/04 "Viewer
    model".
  - The "Which one are you?" sheet (D3).
  - A `useGlowData()` hook that runs the T03 functions for the current viewer,
    memoised.
  - Wrap the ledger page's client tree in both.
- **Read:** docs/04 "Viewer model", docs/06 "Viewer switcher".
- **Done when:**
  - Switching the stored viewer recomputes every number with no refetch.
  - An archived or deleted stored viewer falls back cleanly.
  - The prompt shows only when nothing is stored.

### Phase 3: the group page

**T07 · Page frame and viewing-as switcher** · L · depends on T06
- **Build:**
  - `GroupHeader` (desktop and phone), tabs driven by `?tab=`,
    `PhoneActionBar`, `ShortcutFooter` (labels only; keys come in T17).
  - The Invite popover (D2).
  - `ViewerPill` / `ViewerMenu` / `ViewerSheet`, with the theme setting (D4)
    and "Manage members". That opens the existing `UserManagementModal`,
    restyled with tokens; keep its logic.
  - Remove the floating `ActionMenu`. Its Add expense and Add payment open the
    old modals until T13 and T15 replace them.
- **Boards:** 01, 03, 19, 20, 21, 22.
- **Read:** docs/01 "Shared page frame" and "Viewing-as switcher", docs/03
  "Page frame" and "Viewing-as switcher", docs/04 breakpoints.
- **Done when:**
  - The header and switcher match the boards at 1280 and 390, light and dark.
  - Manage members still adds, renames, removes and restores.
  - The old modals still open.

**T08 · Activity summary: hero and share card** · M · depends on T07
- **Build:**
  - `BalanceHero`, including the owe and settled states from docs/06.
  - `PersonChips`: hide zeros (D11); clicking one sets the "with {name}"
    filter, which T10 wires up.
  - `ShareOfSpendCard`, with the "still to cover" style for paid < share.
- **Boards:** 01, 03, 23.
- **Done when:**
  - The numbers for Jacky and for Stephen match boards 03 and 23 exactly.
  - Large amounts scale down past 9 characters (07 C).

**T09 · Ledger table and list** · L · depends on T07
- **Build:**
  - `LedgerTable` (desktop): date shown on the first row of each day, payment
    rows with the tag and note, "not involved", running balance, selection
    styling.
  - `LedgerList` (phone).
  - Remove `ExpenseCard` and `PaymentCard` from the page. Delete the files in
    T21, not here.
  - Clicking a row sets `?e=`; T11 opens the panel.
- **Boards:** 01, 03, 23.
- **Done when:** every row's impact and balance match `expected.json` for both
  viewers, and the table scrolls sideways instead of overflowing below 560px.

**T10 · Search and filters** · M · depends on T08, T09
- **Build:** `SearchField` plus `FilterChips` in the toolbar, the "with {name}"
  chip filter, and the matching rules from docs/04 "Filtering and search".
  The rules are pure functions in `src/lib/glow/filter.ts`, with tests.
- **Done when:**
  - Typing `109`, `$109` or `109.74` finds that expense.
  - Running balances don't change when filtered.
  - Filters reset on a viewer change, except "Involving me".

**T11 · Right panel, drawer and sheet** · L · Review · depends on T07
- **Build:**
  - The panel state machine from docs/04 "Page model": empty, details, add,
    edit. It's driven by `?e=` and `?panel=`.
  - The inline panel at ≥1024px, an overlay drawer at 640–1023px, and a
    full-height sheet under 640px (grabber, close, swipe down, focus trap,
    inert background).
  - Reuse or extend `useModalKeyboard` for Escape and focus return.
  - The dirty-form "Discard…?" prompt.
- **Done when:**
  - Every transition in the docs/04 table works.
  - Refreshing the page keeps the panel state.
  - Focus moves into the panel on open and back to the opener on close, at
    all three widths.

**T12 · Expense details** · M · depends on T09, T11, T04
- **Build:**
  - `ExpenseDetails` from boards 15/16: the impact strip, the "paid by … split
    …" sentence (it uses `split_mode`; old rows say "custom split"), and split
    rows worded from the viewer's side.
  - Actions: Edit (opens the old edit modal until T14), Duplicate (opens add,
    prefilled), and Delete with the D14 confirmation.
  - Replace `ExpenseDetailsModal`.
- **Boards:** 15, 16, 23 (details panel).
- **Done when:**
  - The wording matches docs/06 for "viewer paid", "viewer in split" and
    "viewer not involved".
  - Delete removes the expense and returns the panel to empty.

**T13 · Composer: shell and Equally** · L · Review · depends on T11, T04, T05
- **Build:**
  - `ExpenseComposer` in add mode: the gradient card (description with
    counter, 48px amount, currency pill), the "Paid by [●] on [date]" sentence
    (D7), split-mode tabs, the Equally body with live per-person amounts and
    the remainder note, the status strip with the impact line, and the Save
    button with its blocked reason.
  - "Save and add another".
  - Saves through `saveExpense` with `split_mode`, `weight` and `created_by`.
- **Boards:** 09, 10, 17, 18.
- **Read:** docs/01 "Add expense", docs/03 `ExpenseComposer`, docs/04
  "Composer behaviour", docs/06 "Composer".
- **Done when:**
  - The 6450 ÷ 4 example matches the board, including the note and the
    "+CA$48.37" impact.
  - ⌘↵ saves.
  - A failed save shows the error inline and keeps the form.

**T14 · Composer: Exact, Percent, Shares, Edit** · L · Review · depends on T13
- **Build:**
  - The Exact and Percent bodies, with live computed amounts and the
    "Split CA$X across the N blank rows" helper.
  - The Shares body (D17).
  - Edit mode: "Edit expense", "Save changes", Delete, and reopening the
    stored mode (old rows open in Exact).
  - Remove `ExpenseModal`.
- **Boards:** 11, 12, 13, 14.
- **Done when:**
  - Every validation row in docs/04 "Validation per mode" behaves as
    written.
  - Editing a percent expense reopens as percent with the same numbers
    (KNOWN-ISSUES 1.2 is fixed).

**T15 · Payments: add, details, edit** · M · depends on T11, T09
- **Build:**
  - The Add payment panel (D16) through `savePayment`.
  - Selecting a payment row shows its details, with Edit and Delete.
  - Remove `PaymentModal`.
- **Boards:** none (not designed). Match the composer's shell and tokens.
- **Done when:**
  - A payment can be added, edited and deleted from both Activity and phone.
  - Ledger rows read "{payer} paid you" with the "in"/"out" impact.

**T16 · Balances tab** · L · depends on T07, T15
- **Build:**
  - The hero with `StatTiles`.
  - `SettleUpPlan`: the Simplify switch bound to `setSimplifyDebts`, the
    "Involving you" and "Rest of the group" sections, the D1 caption, and
    Mark paid, which opens the T15 panel prefilled.
  - `EveryoneBreakdown`: an accordion on phone; on desktop, a grid with a
    three-column expanded row.
  - Remove `BalancesView`.
- **Boards:** 05, 06, 07, 08.
- **Done when:**
  - The tiles add up to the hero.
  - Mark paid records the payment and every number updates.
  - Toggling Simplify changes the plan and its subtitle count.

### Phase 4: finish

**T17 · Keyboard shortcuts** · M · depends on T10, T12, T14, T16
- **Build:** the docs/04 shortcut table (D21), ignored while typing except for
  Esc and ⌘↵, plus `<kbd>` hints shown only for fine pointers. Also `1`/`2`
  for tabs and `V` for the viewer menu.
- **Done when:** every key in the table works on Activity and Balances, and
  nothing fires while the cursor is in a text field.

**T18 · States and edge cases** · M · depends on T16
- **Build:**
  - Empty states: no expenses, no search results, an empty panel, everyone
    settled.
  - `loading.tsx` skeletons for the hero and the rows.
  - Inline errors plus the toast (D15), replacing every remaining `alert()`
    (KNOWN-ISSUES 4.3).
  - Long names and long descriptions.
  - More than 5 other members in the chip row.
- **Done when:** `grep -rn "alert(" src` returns nothing, and each state has
  been seen in a screenshot.

**T19 · Accessibility and motion pass** · S · depends on T18
- **Check:** the docs/04 "Focus and accessibility" list, `prefers-reduced-motion`,
  and contrast spot checks in dark mode.
- **Done when:** every item on that list is checked off in the log entry.

**T20 · Restyle the home and create-group pages** · S · depends on T02
- **Build:** apply the font, the tokens and dark mode to `/` and
  `/create-group`, with no layout redesign (D22).

**T21 · Ship** · M · owner and an agent · depends on everything above
- **Agent:**
  - Delete the now-unused old components.
  - Make sure `npm run lint` is clean (KNOWN-ISSUES 5.2 should be gone with
    `ExpenseModal`).
  - Update `features.md`, `db-chart.md` and `KNOWN-ISSUES.md` (remove 1.2,
    4.3 and 5.2).
  - Do a final screenshot pass against all 24 boards.
- **Owner:**
  - Apply the T04 migration to production.
  - Merge `glow` into `main`.
  - Check production.

---

## Order at a glance

```
T00a, T00b (owner)
  ├─ T01 seed           ┐
  ├─ T02 tokens ── T05 components ─┐
  ├─ T03 calc layer ───────────────┼─ T06 viewer ── T07 frame ─┬─ T08 hero ──┐
  └─ T04 schema                    │                           ├─ T09 ledger ┴─ T10 search
                                   │                           └─ T11 panel ─┬─ T12 details
                                   │                                         ├─ T13 composer ── T14 modes/edit
                                   │                                         └─ T15 payments ── T16 balances
  T20 (any time after T02)                                     T17 keys · T18 states · T19 a11y · T21 ship
```

These can run at the same time, in separate worktrees:
- T01, T02, T03 and T04;
- after T07: T08, T09 and T11;
- after T11: T13 and T15.

Two tasks that both edit `src/app/ledger/[id]/page.tsx` (T07, T08, T09,
T11) will conflict there. Keep those edits small, or run those tasks one
after another.
