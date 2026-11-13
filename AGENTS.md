<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Glow redesign work

The Glow UI redesign is built on the **`glow` branch**, not `main`. The plan, procedures and progress log there are the source of truth; the copies of `docs/potluck-glow-redesign/PLAN.md` and `PROGRESS.md` on `main` are out of date until the redesign ships.

If you were asked to work on Glow, or to continue or pick up the build:

```bash
git fetch origin && git checkout glow   # or a worktree: git worktree add ../glow glow
```

Then read `AGENTS.md` again on that branch and follow it. Everything needed to continue is in the repo there; no chat history is required. Never touch the production Supabase project (ref `xjkvjfmdljdpynlumszz`).
