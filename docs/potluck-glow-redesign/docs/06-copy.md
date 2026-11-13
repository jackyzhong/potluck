# 06 · Copy

Every string in the mockups, plus the variants the mockups imply. Tone: plain, friendly, short. Sentence case everywhere (no Title Case on buttons). "You" always means the current viewer.

## Header and navigation
| Key | Text |
|---|---|
| tabs | Activity · Balances |
| header.invite | Invite |
| header.addPayment | Add payment |
| header.addExpense | Add expense |
| viewer.caption | Viewing as |
| viewer.phoneSub | Viewing as {name} |
| viewer.buttonLabel (aria) | Viewing as {name}, switch person |
| back (aria) | Back to groups |
| invite.toast (suggested) | Link copied. Anyone with it can view and add expenses. |

## Hero (Activity)
| Situation | Label | Sub-line |
|---|---|---|
| net > 0, some owe you, you owe some | You're owed | {n} people owe you · you owe {name} *(or "you owe {m} people")* |
| net > 0, everyone owes you | You're owed | Everyone else owes you |
| net > 0, some owe you, none owed | You're owed | {n} people owe you *(1: "{name} owes you")* |
| net < 0 (not drawn) | You owe | You owe {n} people · {name} owes you *(mirror of the above)* |
| net = 0 (not drawn) | You're all settled | Nothing owed either way |

Chips: "{name}" over "+28.79" / "−16.38".

## Share of spend
Trip so far · Group spent {total} · Your share {share} · You paid {paid}
Bar `aria-label`: "You paid {paid} of the group's {total}; your share is {share}"

## Toolbar
Search placeholder: Search expenses, people, amounts · Filters: All · Expenses · Payments · Involving me · Person filter chip (suggested): With {name} ✕ · No results (suggested): Nothing matches "{query}"

## Ledger
| Element | Text |
|---|---|
| columns | Date · Description · Paid by · Total · Your impact · Balance |
| payment title | {payer} paid you · You paid {payee} · {payer} paid {payee} |
| payment tag | Payment |
| payment impact | {amount} in · {amount} out |
| not involved | not involved |
| viewer as payer | You |
| phone meta (expense) | {date} · {payer} paid {total} *(viewer: "You paid {total}")* |
| phone meta (payment) | {date} · payment · {note} |
| phone balance | bal. {balance} |
| untitled expense (suggested) | Untitled expense |

## Right panel / details
| Element | Text |
|---|---|
| meta | {date} · added by {name} *("added by you")* |
| impact strip, viewer paid | You paid, so you lent · +{x} |
| impact strip, viewer in split | Your share · −{x} |
| impact strip, not involved (suggested) | You're not part of this one |
| sentence | Paid by [{payer}] and split [equally, {n} ways] · [by exact amounts] · [by percentage] · [by shares] |
| split row: payer | paid, share {x} |
| split row: someone owes the viewer | owes you {x} |
| split row: viewer owes the payer | owe {payer} {x} *(the row's name reads "You")* |
| split row: third party | owes {payer} {x} |
| actions | Edit · Duplicate · Delete |
| delete confirm (suggested) | Delete this expense? It'll be removed for everyone. · Cancel · Delete |
| empty panel (suggested) | Select an expense to see how it was split. |

## Composer
| Element | Text |
|---|---|
| title | Add expense · Edit expense |
| description label | What was it for? |
| description counter | {n}/50 |
| amount label | Amount |
| currency pill | {CODE} ▾ (e.g. CAD) |
| sentence | Paid by [{name ▾}] on [Today ▾] *(Yesterday / "Sep 8")* |
| modes | Equally · Exact · Percent · Shares |
| equal header | {k} of {n} people included · Include everyone |
| equal excluded row | not included |
| remainder note | {total} doesn't divide evenly by {k}, so {names} each take an extra cent. *(names: "you and Stephen", "Stephen", "you, Stephen and Angus")* |
| exact placeholder | 0.00 |
| exact helper | Split {x} across the {n} blank rows *(1: "Put {x} in the blank row")* |
| status valid | Fully assigned · 100% assigned |
| status impact | You'll be owed {x} more · You'll owe {x} more · This doesn't change your balance |
| status remaining | {x} left to assign · {sum} of {total} · {x} too much |
| status percent remaining | {p}% left to assign · {sum}% of 100% · {p}% too much |
| status none included | Pick at least one person |
| buttons | Save and add another · Save expense · Save changes |
| blocked save | Enter an amount · Assign {x} more to save · Remove {x} to save · Make it add up to 100% |
| discard (suggested) | Discard this expense? · Discard changes? · Keep editing · Discard |
| saved toast (suggested) | Expense added · Changes saved · Undo |

## Balances
| Element | Text |
|---|---|
| tiles | You paid · Your share · Paid back *(desktop: "Already paid back to you")* |
| desktop hero sub-line | {names} pay you once debts are simplified *(variants: "{name} pays you…", "You pay {name} once debts are simplified")* |
| plan title | Settle-up plan |
| plan subtitle | {n} payments clear the whole group *(1: "One payment clears the whole group")* |
| switch | Simplify (phone) · Simplify debts (desktop) |
| sections | Involving you · Rest of the group |
| transfer | {from} pays you · You pay {to} · {from} pays {to} |
| action | Mark paid |
| mark-paid toast (suggested) | Marked {from} → {to} {x} as paid · Undo |
| settled (suggested) | Everyone's square. |
| everyone title | Everyone |
| everyone hint | Tap a person to see how their balance adds up *(desktop: "Click …")* |
| net labels | gets back {x} · owes {x} · *(viewer:)* get back {x} · owe {x} · settled up |
| breakdown | Paid for the group · Their share · Payments · Net · Show {n} expenses |
| desktop columns | Person · Paid · Share · Payments · Net |
| payments cell | received {x} · sent {x} · none |
| desktop breakdown headings | Paid for the group · Their share · Adds up to (Total paid, Total share, Payments, Net) |

## Viewer switcher
View the group as · Amounts and “you” switch to this person · {name} · gets back {x} / owes {x} / settled up · Manage members
First visit (suggested): Which one are you? · Pick yourself so balances are shown from your side. You can change this any time.
Switch announcement (aria-live): Now viewing as {name}

## Footer hints
J K move between rows · Enter open · E edit · / search · N add expense · P add payment
Balances: J K move between people · Enter expand · D simplify debts on or off · N add expense · P add payment
