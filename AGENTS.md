<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working on Potluck

- **Docs:** `docs/features.md` (what's built), `docs/calculations.md` (how every number is computed), `docs/db-chart.md` (schema and access model), `docs/KNOWN-ISSUES.md` (the running log of what's broken or missing; read it before picking work up).
- **Databases:** never touch the production Supabase project (ref `xjkvjfmdljdpynlumszz`) unless the owner asks. Local runs and Vercel Preview use the dev project (`pooogudusmmfuztxaqfg`); README "Local setup" has the steps and the check script.
- **Migrations:** schema changes go in `supabase/migrations/`. Apply a new one to dev under the file's version number; the owner decides when it goes to production, before the code that needs it is merged to `main`.
- **Sample data:** the made-up "Cabin Trip" group in `src/lib/glow/fixtures/cabin-trip.json` is the only sample group. The tests, `scripts/seed-dev.mjs` and the landing screenshots (`scripts/landing-screenshots/README.md`) all use it. Never use a real group in tests, seeds or screenshots.
- **Checks before you finish:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- **Design history:** the Glow redesign's spec, mockups, decision log (D1–D36) and build log were removed after it shipped. Code comments still cite them ("D14", "docs/04"); read them at commit `fdaa410` (`git show fdaa410:docs/potluck-glow-redesign/PLAN.md`).
