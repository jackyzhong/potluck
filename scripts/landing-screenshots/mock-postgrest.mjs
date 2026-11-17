// Read-only stand-in for Supabase's PostgREST, serving one fictional group.
// node mock-postgrest.mjs <demo-group.json> <port>
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";

const [file, port = "54399"] = process.argv.slice(2);
const fx = JSON.parse(readFileSync(file, "utf8"));

function uuidFor(id) {
  const h = createHash("sha1").update(`potluck-demo:${id}`).digest("hex");
  const v = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const L = uuidFor(fx.ledger.id);
const order = fx.users.map((u) => u.id);
const t = {
  ledgers: [{ id: L, title: fx.ledger.title, emoji: fx.ledger.emoji, base_currency: fx.ledger.base_currency,
    simplify_debts: fx.ledger.simplify_debts, created_at: "2026-10-01T10:00:00Z" }],
  users: fx.users.map((u) => ({ id: uuidFor(u.id), ledger_id: L, name: u.name, is_placeholder: true, archived_at: null, created_at: u.created_at })),
  expenses: [], splits: [],
  payments: fx.payments.map((p) => ({ id: uuidFor(p.id), ledger_id: L, payer_id: uuidFor(p.payer_id), payee_id: uuidFor(p.payee_id),
    amount_cents: p.amount_cents, original_currency: "CAD", note: p.note, created_at: p.created_at, created_by: uuidFor(p.payer_id) }))
};
for (const e of fx.expenses) {
  const id = uuidFor(e.id);
  t.expenses.push({ id, ledger_id: L, payer_id: uuidFor(e.payer_id), description: e.description, amount_cents: e.amount_cents,
    original_currency: "CAD", created_at: e.created_at, split_mode: "equal", created_by: uuidFor(e.payer_id) });
  const ps = (e.participants === "all" ? order : order.filter((u) => e.participants.includes(u)));
  const base = Math.floor(e.amount_cents / ps.length), extra = e.amount_cents - base * ps.length;
  ps.forEach((u, i) => t.splits.push({ id: uuidFor(`${e.id}:${u}`), expense_id: id, user_id: uuidFor(u), amount_cents: base + (i < extra ? 1 : 0), weight: null }));
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
  const send = (code, body, headers = {}) => { res.writeHead(code, { "content-type": "application/json", ...headers }); res.end(body === undefined ? "" : JSON.stringify(body)); };
  if (!m || !t[m[1]] || req.method !== "GET" && req.method !== "HEAD") {
    console.log("refused", req.method, req.url);
    return send(400, { message: "mock is read-only", code: "MOCK" });
  }
  let rows = [...t[m[1]]];
  let orderBy = null;
  for (const [k, v] of u.searchParams) {
    if (k === "select" || k === "limit" || k === "offset") continue;
    if (k === "order") { orderBy = v; continue; }
    const [op, ...rest] = v.split("."); const val = rest.join(".");
    if (op === "eq") rows = rows.filter((r) => String(r[k]) === val);
    else if (op === "in") { const set = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")); rows = rows.filter((r) => set.includes(String(r[k]))); }
    else if (op === "is") rows = rows.filter((r) => String(r[k]) === val);
  }
  if (orderBy) {
    const [col, dir] = orderBy.split(".");
    rows.sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (dir === "desc" ? -1 : 1));
  }
  const sel = u.searchParams.get("select");
  if (sel && sel !== "*") { const cols = sel.split(",").map((c) => c.trim()); rows = rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))); }
  const lim = u.searchParams.get("limit"); if (lim) rows = rows.slice(0, +lim);
  const range = { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
  if (req.method === "HEAD") return send(200, undefined, range);
  if ((req.headers.accept || "").includes("vnd.pgrst.object")) {
    return rows.length === 1 ? send(200, rows[0], range) : send(406, { message: "not one row", code: "PGRST116" });
  }
  send(200, rows, range);
}).listen(+port, () => console.log(`mock on ${port}; ledger ${L}`));
