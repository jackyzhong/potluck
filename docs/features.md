# Feature Specifications: Potluck

This document defines the logic and state transitions for complex features within the Potluck application.

---

## 1. Feature: Group Member Management (MVP)

**Problem:** In Splitwise, an organizer cannot assign an expense to someone who hasn't downloaded the app or created an account yet.
**Solution (current MVP scope):** Any participant with the group link can add a plain named member to the ledger — no email, phone number, or account required. Any member can then be selected as the payer or as a split participant on any expense.

### Logic Flow (as built)
1. **Creation:** From the ledger page, a user opens "Manage Users" and adds a name.
2. **Assignment:** That name immediately becomes selectable as a payer or split participant on any expense in the ledger — there is no separate join or activation step.
3. **No ownership/identity binding:** All members are equivalent, undifferentiated rows tied to the ledger (`is_placeholder` is always `true`). There is no concept of "this browser is Alice" — anyone with the link can add expenses on behalf of anyone in the list.

This is intentionally simple for the MVP: it covers the core use case (a small trusted group splitting costs) without needing accounts or a join flow.

### Deferred (Post-MVP): "Claiming" / Identity Binding

**Out of scope for now.** The original design explored letting invitees "claim" a placeholder name via Local Storage session binding, tying a specific browser/device to a user row so historical expenses become "theirs." This has been deprioritized in favor of other MVP-critical work (see Split Logic validation and Payments below). The schema already reserves columns for this (`device_token`, `phone_number`, `auth_user_id` — see [db-chart.md](./db-chart.md)), but no app logic uses them yet.

If/when this is revisited, the original flow was:
1. Organizer adds placeholder names (no emails/phones); each defaults to unclaimed.
2. Organizer shares the group URL.
3. A new visitor without a stored session sees "Who are you?" — pick an existing unclaimed name, or add a new one.
4. Picking an existing name "claims" it and links the visitor's device to that user, making their historical expenses visible/editable to them.

```mermaid
graph TD
    A[Start: Visit Group Link] --> B{Existing Session?}
    B -- Yes --> C[Show Group Dashboard]
    B -- No --> D[Screen: 'Who are you?']

    D --> E[Button: Select Existing Name]
    D --> F[Button: Add New Name]

    F --> G[Input Name]
    G --> H[Create New User ID]
    H --> I[Store Session in Local Storage]

    E --> J[Display List of Unclaimed Names]
    J --> K[Select 'Alice']
    K --> L[Update Alice: is_claimed = True]
    L --> M[Link Device ID to Alice User ID]
    M --> I

    I --> C
```

---

## 2. Feature: Split Logic

**Core Principles**
* **Integer Arithmetic:** All calculations occur in the smallest currency unit (cents) to prevent floating-point processing errors.
* **Zero-Friction Default:** New expenses default to an Equal split among all group members.

**Split Modes**

The split step offers three mutually-exclusive modes, chosen via a segmented control. Switching modes does not carry values over from another mode. All modes compute their splits once, at save time (there is no live per-field locking/auto-recalculation engine).

* **Equally:** The organizer checks/unchecks which members are included. The total is divided evenly across checked members using `Math.floor(amountCents / count)` per person, with the leftover remainder (from integer division) distributed one cent at a time to the first N members in the list, so the split always sums exactly to the total.
* **Exact Amount:** The organizer types a specific dollar amount per member. Only members with a value greater than 0 are included in the resulting split.
* **Percentage:** The organizer types a percentage per member. Each member's cents are computed as `round(total * pct / 100)`, except the last entered member, who instead absorbs whatever is left over (`total - sum of the others`) so the split sums exactly to the total.

**Allocation Validation:** Exact Amount and Percentage modes show a running allocated/remaining total (in dollars for Exact Amount, in percent for Percentage) that turns red when the entries don't add up to the expense total. The "Confirm & Save" button is disabled until Exact Amount entries sum exactly to the expense total, or Percentage entries sum to 100% (within a small rounding tolerance) — this also rules out Percentage mode's last-entry logic ever producing a negative amount, since entries can no longer overshoot 100% at save time.
