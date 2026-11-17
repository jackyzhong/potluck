# Landing page screenshots

The 12 images in `public/screenshots/` show **Cabin Trip**, a made-up group in
`demo-group.json`. Don't capture them from a real group (the dev "Cabin Trip"
group is a real personal ledger).

No database is involved: `mock-postgrest.mjs` is a tiny read-only stand-in for
Supabase's REST API that serves the demo group, and the app runs against it.

```bash
node scripts/landing-screenshots/mock-postgrest.mjs scripts/landing-screenshots/demo-group.json 54399
```

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 SUPABASE_SECRET_KEY=mock npx next dev -p 3555
```

```bash
node scripts/landing-screenshots/capture.mjs public/screenshots
```

`capture.mjs` uses the ledger id and Sam's id that the mock prints/derives from
`demo-group.json` (uuids from `sha1("potluck-demo:<fixture id>")`); update the
constants at its top if you change those fixture ids. Sizes: laptop 1440×900 at
1.5×; phone, hero, composer, plan and viewer at 390 wide, 2×. Pass `light` or
`dark` as a second argument to capture one theme.
