// Check that .env.local points at the dev Supabase project and that its key
// works there. Loads the file the way Next.js does, so it reports what the app
// will actually use. Never prints the key.
//
//   node scripts/check-dev-env.mjs
//
// Exits 0 when it's safe to run the app, seed or test against the database,
// and 1 otherwise. See docs/potluck-glow-redesign/PLAN.md, "Local setup".

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEV_PROJECT_REF = "pooogudusmmfuztxaqfg";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { loadEnvConfig } = createRequire(resolve(root, "package.json"))("@next/env");

loadEnvConfig(root, true, { info() {}, error: console.error });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing. Copy .env.local (PLAN.md, Local setup).");

let host;
try {
  host = new URL(url).hostname;
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
}
if (host !== `${DEV_PROJECT_REF}.supabase.co`) {
  fail(`.env.local points at ${host}, not the dev project. Stop: don't run the app, a seed or a migration.`);
}
console.log(`✓ URL is the dev project (${host})`);

const res = await fetch(`${url}/rest/v1/ledgers?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
if (!res.ok) fail(`the secret key was rejected by the dev project (HTTP ${res.status}).`);
console.log("✓ the secret key works on the dev project");
