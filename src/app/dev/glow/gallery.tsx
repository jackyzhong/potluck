"use client";

import { useState, type ReactNode } from "react";
import {
  Avatar,
  Button,
  FilterChips,
  Kbd,
  Money,
  SearchField,
  SegmentedControl,
  StatusStrip,
  Switch,
  Toast
} from "@/src/components/glow";
import { memberSlots } from "@/src/lib/glow/avatar";

// Dev-only component gallery. Every foundation component, every variant, drawn
// once in light and once in dark (each panel pins its own data-theme, so both
// show at once whatever the page theme is).

const MEMBERS = [
  { id: "jacky", name: "Jacky", created_at: "2026-09-01T10:00:00Z", archived: false },
  { id: "stephen", name: "Stephen", created_at: "2026-09-01T10:00:01Z", archived: false },
  { id: "angus", name: "Angus", created_at: "2026-09-01T10:00:02Z", archived: true },
  { id: "alvin", name: "Alvin", created_at: "2026-09-01T10:00:03Z", archived: false },
  { id: "matthew", name: "Matthew", created_at: "2026-09-01T10:00:04Z", archived: false },
  { id: "jonah", name: "Jonah", created_at: "2026-09-01T10:00:05Z", archived: false }
];
// Slots count Angus even though he is archived, so Alvin stays yellow.
const SLOTS = memberSlots(MEMBERS);

const FILTERS = [
  { value: "all", label: "All" },
  { value: "expenses", label: "Expenses" },
  { value: "payments", label: "Payments" },
  { value: "mine", label: "Involving me" }
] as const;

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[length:var(--text-card-title)] font-extrabold">{title}</h2>
        {note ? <p className="text-[length:var(--text-meta)] text-text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">{label}</span> : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Everything() {
  const [tab, setTab] = useState<"activity" | "balances">("activity");
  const [tabPhone, setTabPhone] = useState<"activity" | "balances">("balances");
  const [mode, setMode] = useState<"equally" | "exact" | "percent" | "shares">("exact");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [simplify, setSimplify] = useState(true);
  const [simplifyOff, setSimplifyOff] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <Section title="Avatar" note="Slot = position in ledger order, archived members counted. Angus is archived; Alvin keeps slot 4.">
        <Row label="member, by slot (28 / 32 / 36 / 38)">
          {([28, 32, 36, 38] as const).map((s) => (
            <Avatar key={s} name="Jacky" slot={1} size={s} />
          ))}
        </Row>
        <Row label="member, from ledger order (Angus archived)">
          {MEMBERS.map((m) => (
            <span key={m.id} className={`inline-flex items-center gap-1.5 text-[length:var(--text-meta)] ${m.archived ? "opacity-60" : ""}`}>
              <Avatar name={m.name} slot={SLOTS.get(m.id)} size={32} />
              {m.name}
              {m.archived ? " (archived)" : ""}
            </span>
          ))}
        </Row>
        <Row label="you">
          {([28, 32, 36, 38] as const).map((s) => (
            <Avatar key={s} name="Jacky" variant="you" size={s} />
          ))}
        </Row>
        <Row label="onGlow (on the gradient)">
          <span className="inline-flex gap-2 rounded-chip [background:var(--gradient-glow-compact)] p-3">
            {([28, 32, 36, 38] as const).map((s) => (
              <Avatar key={s} name="Matthew" variant="onGlow" size={s} />
            ))}
          </span>
        </Row>
      </Section>

      <Section title="Money" note="Integer cents in. True minus (U+2212), tabular numerals.">
        <Row label="plain / signed / compact">
          <Money cents={117590} />
          <Money cents={9145} signed />
          <Money cents={-1250} />
          <Money cents={2879} compact />
          <Money cents={-1638} compact />
          <Money cents={0} />
        </Row>
        <Row label="tone: positive / negative / neutral / auto">
          <Money cents={9145} signed tone="positive" />
          <Money cents={-1250} signed tone="negative" />
          <Money cents={4200} tone="neutral" />
          <Money cents={5191} signed tone="auto" />
          <Money cents={-5191} signed tone="auto" />
          <Money cents={0} signed tone="auto" />
        </Row>
        <Row label="tabular alignment">
          <div className="grid grid-cols-[auto_auto] gap-x-6 text-right text-[length:var(--text-body)] font-bold">
            <Money cents={111111} />
            <Money cents={-111111} />
            <Money cents={88888} />
            <Money cents={-88888} />
          </div>
        </Row>
      </Section>

      <Section title="Kbd" note="Hidden on touch devices (hover: none).">
        <Row>
          <Kbd>N</Kbd>
          <Kbd>/</Kbd>
          <Kbd>⌘↵</Kbd>
        </Row>
      </Section>

      <Section title="Button">
        <Row label="primary / secondary / soft / soft in panel / text">
          <Button onClick={() => setClicks((c) => c + 1)}>Add expense</Button>
          <Button variant="secondary">Invite</Button>
          <Button variant="soft">Duplicate</Button>
          <Button variant="soft" inPanel>
            Mark paid
          </Button>
          <Button variant="text" tone="positive">
            Include everyone
          </Button>
          <Button variant="text" tone="negative">
            Delete
          </Button>
        </Row>
        <Row label="with key hint">
          <Button kbd="N">Add expense</Button>
          <Button variant="secondary" kbd="P">
            Add payment
          </Button>
          <Button size={48} kbd="⌘↵">
            Save expense
          </Button>
        </Row>
        <Row label="sizes 44 / 48 / 52">
          <Button size={44}>Edit</Button>
          <Button size={48}>Edit</Button>
          <Button size={52}>Edit</Button>
        </Row>
        <Row label="icon (44 × 44 hit area)">
          <Button variant="icon" aria-label="Close">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Button>
        </Row>
        <Row label="disabled: aria-disabled, still focusable, click does nothing">
          <Button size={48} disabled>
            Assign CA$20.00 more to save
          </Button>
          <span className="text-[length:var(--text-meta)] text-text-muted">Add expense clicked {clicks}×</span>
        </Row>
      </Section>

      <Section title="SegmentedControl" note="Arrow keys, Home and End move between segments.">
        <Row label="pill, 40px (desktop)">
          <SegmentedControl
            aria-label="Group views"
            options={[
              { value: "activity", label: "Activity" },
              { value: "balances", label: "Balances" }
            ]}
            value={tab}
            onChange={setTab}
          />
        </Row>
        <div className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">pill, 44px, full width (phone)</span>
          <SegmentedControl
            aria-label="Group views, phone"
            size={44}
            fill
            options={[
              { value: "activity", label: "Activity" },
              { value: "balances", label: "Balances" }
            ]}
            value={tabPhone}
            onChange={setTabPhone}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">split mode</span>
          <SegmentedControl
            aria-label="How to split"
            variant="split"
            options={[
              { value: "equally", label: "Equally" },
              { value: "exact", label: "Exact" },
              { value: "percent", label: "Percent" },
              { value: "shares", label: "Shares" }
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
      </Section>

      <Section title="FilterChips">
        <FilterChips aria-label="Filter activity" options={FILTERS} value={filter} onChange={setFilter} />
      </Section>

      <Section title="SearchField">
        <div className="max-w-sm">
          <SearchField value={query} onChange={setQuery} />
        </div>
      </Section>

      <Section title="Switch" note="Off track is undrawn in the boards; chosen for 3:1 contrast.">
        <Row>
          <Switch label="Simplify debts" checked={simplify} onCheckedChange={setSimplify} />
          <Switch label="Simplify" checked={simplifyOff} onCheckedChange={setSimplifyOff} />
        </Row>
      </Section>

      <Section title="StatusStrip" note="role=status, aria-live=polite.">
        <StatusStrip tone="positive" message="Fully assigned" detail={<>You&rsquo;ll be owed <strong className="tabular-nums">CA$48.37</strong> more</>} />
        <StatusStrip tone="warning" message="CA$20.00 left to assign" detail="CA$44.50 of CA$64.50" />
      </Section>

      <Section title="Toast" note="Presentational only; T18 wires it in. Not positioned here.">
        <Row>
          <Toast message="Expense added" />
          <Toast variant="error" message="Couldn't save. Try again" />
        </Row>
      </Section>
    </div>
  );
}

export function Gallery() {
  return (
    <main className="min-h-screen bg-bg px-4 py-6 text-text sm:px-6">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-[length:var(--text-page-title)] font-extrabold tracking-[var(--tracking-title)]">Glow foundation components</h1>
        <p className="text-[length:var(--text-meta)] text-text-muted">
          Dev only: hidden on the production deployment. Each component is drawn in light, then in dark.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        {(["light", "dark"] as const).map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            className="rounded-hero border border-line bg-bg p-5 text-text"
          >
            <p className="mb-4 text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">{theme}</p>
            <Everything />
          </div>
        ))}
      </div>
    </main>
  );
}
