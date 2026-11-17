import Link from "next/link";
import { Avatar } from "@/src/components/glow/Avatar";
import { Kbd } from "@/src/components/glow/Kbd";
import { LandingScreenshot } from "@/src/components/glow/LandingScreenshot";

const GITHUB_URL = "https://github.com/jackyzhong/potluck";

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const MINI_CARDS = [
  {
    title: "No ads",
    body: <>Potluck is free to use and shows no ads.</>
  },
  {
    title: "Keyboard shortcuts",
    body: (
      <>
        On desktop, press <Kbd>N</Kbd> to add an expense, <Kbd>P</Kbd> to add a payment and{" "}
        <Kbd>/</Kbd> to search.
      </>
    )
  },
  {
    title: "Light and dark modes",
    body: <>Comes in a light theme and a dark theme.</>
  }
] as const;

const STEPS = [
  {
    step: 1,
    title: "Create a group",
    body: "Name it and add the people in it. It takes a few seconds and needs no account."
  },
  {
    step: 2,
    title: "Share the link",
    body: "Send the group link to your friends. Anyone with the link can see the group and add expenses."
  },
  {
    step: 3,
    title: "Add expenses, then settle up",
    body: "Log who paid for what. Potluck keeps the running totals and shows who should pay whom."
  }
] as const;

const TECH_ITEMS = [
  { name: "Next.js", note: "The web app and its REST API" },
  { name: "Supabase", note: "Postgres database with row-level security" },
  { name: "Vercel", note: "Hosting and deploys" },
  {
    name: "Two settlement algorithms",
    note: "Exact debts between each pair of people, or a simplified plan with fewer payments"
  },
  { name: "Whole cents", note: "Money is stored as integers, so every split adds up exactly" }
] as const;

export default function Home() {
  return (
    <div id="top" className="min-h-dvh bg-bg text-[15px] leading-[1.4] text-text">
      <div className="mx-auto box-content flex max-w-[1200px] flex-col gap-14 px-4 pb-8 sm:gap-24 sm:px-6 sm:pb-12">
        <div className="flex flex-col gap-6 sm:gap-10">
          <header className="flex items-center justify-between gap-4 py-4">
            <a
              href="#top"
              className="flex items-center gap-2.5 text-text no-underline focus-visible:rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span aria-hidden="true" className="text-2xl leading-none sm:text-[28px]">
                🍲
              </span>
              <span className="text-[20px] font-extrabold tracking-[-0.01em]">Potluck</span>
            </a>
            <nav aria-label="Page" className="flex items-center gap-2">
              <a
                href="#features"
                className="hidden h-11 items-center rounded-pill px-3 font-semibold text-text-secondary no-underline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
              >
                Features
              </a>
              <a
                href="#how"
                className="hidden h-11 items-center rounded-pill px-3 font-semibold text-text-secondary no-underline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
              >
                How it works
              </a>
              <a
                href="#why"
                className="hidden h-11 items-center rounded-pill px-3 font-semibold text-text-secondary no-underline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
              >
                Why I built it
              </a>
              <a
                href="#github"
                className="hidden h-11 items-center rounded-pill px-3 font-semibold text-text-secondary no-underline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
              >
                GitHub
              </a>
              <Link
                href="/create-group"
                className="flex h-11 items-center rounded-pill bg-button-primary-bg px-4 font-bold text-button-primary-fg no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Create a group
              </Link>
            </nav>
          </header>

          <div className="flex flex-wrap items-end gap-5 sm:gap-x-12 sm:gap-y-6">
            <div className="flex flex-[1_1_100%] flex-col items-start gap-4 sm:flex-[1_1_520px]">
              <span className="rounded-[10px] bg-positive-tag-bg px-2 py-0.5 text-[length:var(--text-small)] font-semibold text-positive-tag-fg">
                Beta
              </span>
              <h1 className="m-0 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[72px]">
                Split the bill.
                <br />
                <span className="text-text-muted">Zero friction.</span>
              </h1>
            </div>
            <div className="flex flex-[1_1_100%] flex-col gap-4 sm:max-w-[460px] sm:flex-[1_1_380px]">
              <p className="m-0 text-[17px] leading-[1.5] text-text-secondary">
                The account-less, ad-free way to track group expenses. Create a group, share the
                link, and settle up.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/create-group"
                  className="inline-flex h-[52px] flex-[1_1_100%] items-center justify-center gap-2 rounded-pill bg-button-primary-bg px-[22px] text-[16px] font-bold text-button-primary-fg no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
                >
                  Create a group <ArrowRightIcon />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-[52px] flex-[1_1_100%] items-center justify-center rounded-pill bg-button-secondary-bg px-[22px] text-[16px] font-bold text-text no-underline shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
                >
                  See how it works
                </a>
              </div>
              <span className="text-[13px] text-text-muted">Free to use. No account, no ads.</span>
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <figure className="m-0 flex min-w-0 flex-1 flex-col gap-3">
              <div className="rounded-tile bg-surface p-1.5 shadow-card sm:rounded-hero sm:p-2">
                <LandingScreenshot
                  name="laptop"
                  alt="Potluck on a laptop: a group's activity ledger with the balance you're owed, each expense's effect on you, and the selected expense's split"
                  width={1440}
                  height={900}
                  priority
                  className="aspect-[16/10] rounded-[10px] sm:rounded-chip"
                />
              </div>
              <figcaption className="flex flex-col gap-0.5">
                <span className="font-bold">In your browser</span>
                <span className="text-[13px] text-text-muted">On any laptop or desktop.</span>
              </figcaption>
            </figure>

            <figure className="m-0 flex items-end gap-4 sm:flex-[0_0_264px] sm:flex-col sm:items-stretch sm:gap-3">
              <div className="phone-bezel box-border flex-[0_0_210px] rounded-[32px] p-1.5 sm:flex-none sm:rounded-[40px] sm:p-2">
                <LandingScreenshot
                  name="phone"
                  alt="Potluck on a phone: the same group with the balance card and the list of expenses"
                  width={390}
                  height={844}
                  priority
                  className="aspect-[390/844] rounded-[26px] sm:rounded-[32px]"
                />
              </div>
              <figcaption className="flex flex-col gap-0.5">
                <span className="font-bold">On your phone</span>
                <span className="text-[13px] text-text-muted">Works in your phone&apos;s browser.</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <section id="features" className="flex flex-col gap-4 sm:gap-6">
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
            What Potluck does
          </h2>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] gap-4">
            <article className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:rounded-hero sm:p-6">
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">
                  See what you&apos;re owed
                </h3>
                <p className="m-0 text-[15px] leading-[1.5] text-text-secondary">
                  Your balance sits at the top, with who owes you and who you owe. Every expense
                  shows what it did to your total.
                </p>
              </div>
              <div className="box-border flex h-[300px] items-center justify-center overflow-hidden rounded-chip bg-surface-sunken p-5 sm:h-[340px]">
                <div className="w-full max-w-[358px] overflow-hidden rounded-hero shadow-card">
                  <LandingScreenshot
                    name="hero"
                    alt="Balance card reading You're owed CA$51.91, with an amount for each person in the group"
                    width={716}
                    height={500}
                    className="aspect-[358/250]"
                  />
                </div>
              </div>
            </article>

            <article className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:rounded-hero sm:p-6">
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">Split it any way</h3>
                <p className="m-0 text-[15px] leading-[1.5] text-text-secondary">
                  Equally, by exact amounts or by percentage. Each person&apos;s amount updates as
                  you type, and the form tells you when it adds up.
                </p>
              </div>
              <div className="box-border flex h-[300px] items-start justify-center overflow-hidden rounded-chip bg-surface-sunken px-5 pt-5 sm:h-[340px]">
                <div className="w-full max-w-[358px] overflow-hidden rounded-t-hero shadow-card">
                  <LandingScreenshot
                    name="composer"
                    alt="Add expense form splitting CA$64.50 by percentage between four people"
                    width={716}
                    height={1040}
                    className="aspect-[358/520]"
                  />
                </div>
              </div>
            </article>

            <article className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:rounded-hero sm:p-6">
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">
                  Settle up in fewer payments
                </h3>
                <p className="m-0 text-[15px] leading-[1.5] text-text-secondary">
                  Potluck works out a short list of payments that clears the whole group. Mark one
                  as paid and every balance updates.
                </p>
              </div>
              <div className="box-border flex h-[300px] items-start justify-center overflow-hidden rounded-chip bg-surface-sunken px-5 pt-5 sm:h-[340px]">
                <div className="w-full max-w-[358px] overflow-hidden rounded-t-card shadow-card">
                  <LandingScreenshot
                    name="plan"
                    alt="Settle-up plan listing five payments, with Mark paid buttons on the ones that involve you"
                    width={716}
                    height={840}
                    className="aspect-[358/420]"
                  />
                </div>
              </div>
            </article>

            <article className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:rounded-hero sm:p-6">
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">No accounts</h3>
                <p className="m-0 text-[15px] leading-[1.5] text-text-secondary">
                  Open the link, pick your name and you&apos;re in. Nobody has to sign up or install
                  anything.
                </p>
              </div>
              <div className="box-border flex h-[300px] items-start justify-center overflow-hidden rounded-chip bg-surface-sunken px-5 pt-5 sm:h-[340px]">
                <div className="w-full max-w-[358px] overflow-hidden rounded-t-card shadow-card">
                  <LandingScreenshot
                    name="viewer"
                    alt="Menu titled View the group as, listing each member with their balance"
                    width={716}
                    height={840}
                    className="aspect-[358/420]"
                  />
                </div>
              </div>
            </article>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
            {MINI_CARDS.map((card) => (
              <article
                key={card.title}
                className="flex flex-col gap-1.5 rounded-card bg-surface p-5 shadow-card"
              >
                <h3 className="m-0 text-[17px] font-extrabold">{card.title}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-text-secondary">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="flex flex-col gap-4 sm:gap-6">
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
            How it works
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            {STEPS.map((s) => (
              <article
                key={s.step}
                className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card sm:rounded-hero sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-positive"
                >
                  {s.step}
                </span>
                <h3 className="m-0 text-[17px] font-extrabold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.5] text-text-secondary">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="why" className="flex flex-wrap items-start gap-6 sm:gap-x-12 sm:gap-y-6">
          <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-4 sm:flex-[1_1_480px]">
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
              Why I built Potluck
            </h2>
            <p className="m-0 text-[16px] leading-[1.6] text-text-secondary">
              I built Potluck for my own friend group. We were splitting trips and shared bills on
              Splitwise, and I wanted something simpler and more beautiful: no accounts, no ads,
              just a link that everyone can open.
            </p>
            <p className="m-0 text-[16px] leading-[1.6] text-text-secondary">
              My friends use it for real, and their feedback shapes it. Keyboard shortcuts,
              recording payments and the simplified settle-up plan all started as requests from
              them.
            </p>
            <p className="m-0 text-[16px] leading-[1.6] text-text-secondary">
              It&apos;s still in beta, and the code is public if you want to see how it works.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Avatar name="Jacky" slot={1} size={36} />
              <span className="flex flex-col">
                <span className="font-bold">Jacky</span>
                <span className="text-[13px] text-text-muted">Creator · CS student at UBC.</span>
              </span>
            </div>
          </div>

          <aside
            aria-label="Under the hood"
            className="box-border flex min-w-0 flex-[1_1_100%] flex-col gap-3.5 rounded-card bg-surface p-4 shadow-card sm:flex-[1_1_380px] sm:rounded-hero sm:p-6"
          >
            <div className="flex flex-col gap-0.5">
              <h3 className="m-0 text-[17px] font-extrabold">Under the hood</h3>
              <span className="text-[13px] text-text-muted">What Potluck is built with</span>
            </div>
            <div className="flex flex-col">
              {TECH_ITEMS.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-0.5 border-t border-line py-3 first:border-t-0"
                >
                  <span className="font-bold">{item.name}</span>
                  <span className="text-[13px] text-text-muted">{item.note}</span>
                </div>
              ))}
            </div>
            <a
              id="github"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-pill bg-surface-muted-2 font-bold text-text no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View the code on GitHub <ArrowRightIcon />
            </a>
          </aside>
        </section>

        <section
          id="create"
          className="flex flex-wrap items-center justify-between gap-6 rounded-hero p-6 text-on-glow shadow-glow [background:var(--gradient-glow-compact)] sm:p-10 sm:[background:var(--gradient-glow)]"
        >
          <div className="flex flex-[1_1_100%] flex-col gap-1.5 sm:flex-[1_1_420px]">
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
              Split your next bill
            </h2>
            <p className="m-0 text-[16px] leading-[1.5]">
              Create a group, share the link, and you&apos;re set. No account needed.
            </p>
          </div>
          <Link
            href="/create-group"
            className="inline-flex h-[52px] flex-[1_1_100%] items-center justify-center gap-2 rounded-pill bg-on-glow px-[22px] text-[16px] font-bold text-on-glow-avatar-fg no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow sm:flex-none"
          >
            Create a group <ArrowRightIcon />
          </Link>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-text-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[18px] leading-none">
              🍲
            </span>
            <span className="font-bold text-text">Potluck</span>
            <span>Beta</span>
          </span>
          <span className="flex items-center gap-2">
            <span>Built in Vancouver 🇨🇦</span>
            <span aria-hidden="true">·</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-bold text-positive no-underline focus-visible:rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              GitHub
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
