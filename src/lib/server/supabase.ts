import "server-only";

import { createClient } from "@supabase/supabase-js";

// The only Supabase client in the app. It holds the secret key, which bypasses
// row-level security, so it must never reach the browser: `server-only` makes
// the build fail if a client component ever imports this file.
//
// Since the public key has no table access at all, every read and write goes
// through here, and every caller is responsible for scoping what it touches to
// the ledger in the URL. See src/app/ledger/[id]/actions.ts.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set. The secret key is in the " +
      "Supabase dashboard under Project Settings → API Keys (either a sb_secret_… key or the legacy " +
      "service_role key works)."
  );
}

export const db = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
