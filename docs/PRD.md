# Product Requirement Document (PRD): "SwiftSplit" / "Potluck" (Working Title)

**Status:** Draft / Discovery  
**Author:** Jacky Zhong  
**Role:** Product Manager / Lead Engineer  

---

## 1. Executive Summary
**SwiftSplit** or **Potluck** is a low-friction web application designed to simplify expense sharing for groups. Unlike incumbents like Splitwise or Settle Up, SwiftSplit prioritizes immediate utility by removing mandatory account creation and paywalls, and utilizing a "link-first" architecture inspired by Partiful.

## 2. Problem Statement
Existing market solutions have become "bloated," creating significant barriers to entry:
* **High Friction:** Mandatory app downloads and account registration prevent quick adoption in group settings.
* **Aggressive Monetization:** Daily transaction limits and intrusive ads degrade the user experience.
* **Poor UX:** Clunky interfaces make adding simple expenses feel like a chore.

## 3. Target Audience
1.  **The Casual Traveler:** Friends on international trips needing multi-currency support without the hassle of a permanent app.
2.  **The One-Time Event Guest:** Attendees at a dinner or party who need to settle up once via a shared link.
3.  **The Roommates**: A household that has a continuous ledger of payments split across participants (features to be planned in Phase 2)

## 4. User Stories
| ID   | User Role   | Requirement                             | Goal/Benefit                                                              | Priority |
| :--- | :---------- | :-------------------------------------- | :------------------------------------------------------------------------ | :------- |
| US.1 | Organizer   | Create a group and get a shareable link | To invite friends without forcing them to sign up.                        | P0       |
| US.2 | Participant | Join a group and set a display name     | To start adding expenses in <10 seconds.                                  | P0       |
| US.3 | Traveler    | Add expenses in local currency          | To have the app automatically convert to a home currency (CAD/USD).       | P0       |
| US.4 | All Users   | View a "Simplified" debt list           | To minimize the number of actual transfers (A pays C instead of A->B->C). | P1       |
| US.5 | Power User  | Scan a physical receipt                 | To use AI/OCR to automatically split items among the group.               | P2       |
| US.6 | All Users   | Record that they settled up with someone | To close a debt out, instead of leaving it in the balance list forever.   | P1       |

## 5. Functional Requirements (MVP)

### 5.1 Account-less Architecture
* Groups are identified by a unique, obfuscated UUID in the URL.
* User identity is persisted via Browser Local Storage (no login required for immediate use).
* *Optional:* Phone-number-based 2FA for "claiming" a profile long-term. **Deprioritized — not in MVP.** Members are plain names added by anyone with the link; there is no join or claim flow, and no identity binding. The schema carries the columns for it (`users.phone_number`, `auth_user_id`, `is_placeholder`, `device_token`) ahead of any code. See `features.md` §1.

### 5.2 Expense Engine
* **Multi-currency Support:** Integration with an Exchange Rate API. **Not built.** `getExchangeRates()` is a stub pegging every currency at 1.0, so a mixed-currency ledger is silently wrong today. Rates must be locked at expense-creation time and persisted rather than looked up live, or historical balances drift as rates move. Converted shares must also be derived so they sum exactly to the converted total — converting each one independently does not conserve money. See KNOWN-ISSUES §1.4 and §1.5.
* **Transitive Debt Consolidation:** An algorithm to minimize the total number of transactions between users. Built, and shared per-ledger rather than per-viewer: toggling it changes what the whole group sees.
* **Split Logic:** Support for equal splits, exact amounts, and percentages. Built, with allocation validation.

### 5.3 Settlement Engine
* **Payments:** A member records money handed to another member, closing out a debt. A payment names both ends — it credits the payer and debits the payee — because every member's net must keep summing to zero for the transfer list to mean anything.
* **Entry points:** "Settle up" on a suggested transfer (pre-filled from the debt), or a free-form entry for payments that do not match one.
* **Scope:** base currency only until multi-currency above is real. See `features.md` §3 and `payments-design.md`.

### 5.4 UI/UX
* **Mobile-First Design:** Optimized for legibility and entry on a smartphone.
* **Clean Interface:** Zero ads and no "Pro" feature lockouts for core splitting logic.

## 6. Technical Constraints & Design Decisions
* **Data Integrity:** Use integer-based math (storing cents) to avoid floating-point rounding errors—critical for financial accuracy.
* **Statelessness:** The app must remain functional even if a user doesn't have a formal account, relying on the URL as the "key."
* **Tech Stack:** Likely a React/Next.js frontend for speed, with a lightweight Supabase backend for data persistence.

## 7. Success Metrics (KPIs)
* **Time to Onboard:** Goal of <15 seconds from link-click to first expense added.
* **Transaction Volume:** Number of expenses logged per group.
* **Viral Coefficient:** Number of new users joined per "shared link" generated.

---

## 8. Future Roadmap
* **Receipt OCR:** AI integration to parse totals and line items from photos.
* **Offline Mode:** PWA (Progressive Web App) support for logging expenses in areas with poor roaming data.