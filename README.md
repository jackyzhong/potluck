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

## Project Documentation
This project is built with a "Documentation First" approach. Explore the internal specs below:

* **[Product Requirement Document (PRD)](./docs/PRD.md):** The vision, user stories, and success metrics.
* **[Database Schema (DB Chart)](./docs/db-chart.md):** The relational data model and entity relationships.
* **[Feature Specifications](./docs/features.md):** Deep dives into app logic and design decisions.  



## Next.js generated README below
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


