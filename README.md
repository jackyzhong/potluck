# Potluck 🍲
**The frictionless way to split group expenses.**

Potluck is a lightweight web utility designed to solve the "barrier to entry" problem found in modern bill-splitting apps. It allows groups to track expenses and settle debts instantly via shared links, without requiring app downloads or mandatory account registration.


## The Mission
Most bill-splitting apps have become bloated with intrusive ads, daily transaction limits, and high-friction onboarding. **Potluck** is built on the philosophy of "Disposability"—an app that is there when you need it for a trip or a dinner, and stays out of your way when you don't.

### Core Value Propositions:
* **Zero-Friction Onboarding:** Share a unique URL; invitees join and log expenses in seconds.
* **Placeholder Identity:** Organizers can add names to the ledger immediately; users "claim" their profiles later.
* **Audit-Ready Accuracy:** Built with financial integrity in mind, utilizing integer-based currency math to prevent rounding errors.
* **Debt Simplification:** A built-in algorithm minimizes the total number of transactions required to settle up.

## Tech Stack
* **Framework:** [Next.js](https://nextjs.org/) (React)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend-as-a-Service:** [Supabase](https://supabase.com/) (PostgreSQL)
* **State Management:** URL-based UUIDs & LocalStorage
* **Deployment:** [Vercel](https://vercel.com/)

## Running it

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<secret key>
```

The secret key is in the Supabase dashboard under **Project Settings → API Keys**: either a `sb_secret_…` key or the legacy `service_role` key works. It never reaches the browser. All database access happens in server code, and the public key has no table access at all. Set the same two variables in Vercel.

```
npm install
npm run dev
npm test
```

Schema changes go in [`supabase/migrations/`](./supabase/migrations/).

## Project Documentation
This project is built with a "Documentation First" approach. Explore the internal specs below:

* **[Product Requirement Document (PRD)](./docs/PRD.md):** The vision, user stories, and success metrics.
* **[Database Schema (DB Chart)](./docs/db-chart.md):** The relational data model and entity relationships.
* **[Feature Specifications](./docs/features.md):** Deep dives into app logic and design decisions.  