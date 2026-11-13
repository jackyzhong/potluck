<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Glow redesign work

The Glow UI redesign is built task by task on the `glow` branch, and everything needed to continue it is in the repo; no chat history is required.

- Read `docs/potluck-glow-redesign/PLAN.md` first ("Start here" at the top says which sections your role needs), then `docs/potluck-glow-redesign/PROGRESS.md` for where the work stands.
- **Asked to do one task** (e.g. "do T08"): follow "How to work a task" in PLAN.md. Your PR goes into `glow`, never `main`.
- **Asked to continue the build or pick it back up:** you are the coordinator. Follow "Coordinating the build" in PLAN.md.
- Never touch the production Supabase project (ref `xjkvjfmdljdpynlumszz`). Local runs and Vercel Preview use the dev project (`pooogudusmmfuztxaqfg`).
- Record what you did in the PROGRESS.md log before you finish. Anything that matters goes in the repo, not only in the chat.
