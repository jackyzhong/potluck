# 02 · Design tokens

All values live in `tokens/tokens.css` (CSS custom properties) and `tokens/tokens.json`. This page explains how to use them. Components should only ever reference semantic tokens (`--positive`, `--surface`…), never raw hex, because dark mode works by swapping the colour roles while layout, type and radii stay the same.

If the project uses Tailwind, map these variables into `theme.extend` (for example `colors.surface: 'var(--surface)'`) rather than copying hex values into the config.

## Theme model

- Two themes, **light** (default) and **dark**, with identical structure. Only colour roles and elevation change.
- `tokens.css` applies dark from `[data-theme="dark"]` on `<html>`, and follows `prefers-color-scheme` when no explicit theme attribute is set. This allows a later "System / Light / Dark" setting with no token changes.
- **No theme toggle was designed.** Its placement is an open question (docs/07). The viewing-as menu, which becomes the account menu later, is a natural home.
- Dark mode drops all card and button shadows. Cards separate from the background by colour alone (`--surface` #1C1C2E on `--bg` #0F0F1A). The gradient card keeps a stronger glow (`--shadow-glow`).

## Colour roles

| Role | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | #F7F7FA | #0F0F1A | Page background |
| `--surface` | #FFFFFF | #1C1C2E | Cards, panels, menus, sheets, secondary header buttons |
| `--surface-sunken` | #F4F4F9 | #26263C | Text inputs in the composer, expanded breakdown boxes |
| `--surface-muted` | #E9E9F0 | #1C1C2E | Segmented-control track, unselected filter chips, Duplicate button |
| `--surface-muted-2` | #ECECF4 | #2C2C44 | Buttons and split-mode track *inside* panels (Mark paid, pickers, Save and add another) |
| `--segment-selected` | #FFFFFF (+shadow) | #3A3A5E | Selected segment of any segmented control |
| `--text` | #14142B | #F2F2F8 | Body text, titles, amounts without sign meaning |
| `--text-secondary` | #4A4A63 | #C3C3D6 | Running balance column, inactive tab labels, kbd text |
| `--text-muted` | #5C5C73 | #A6A6BD | Meta lines, captions, table headers, placeholders |
| `--line` | #EEEEF3 | #2C2C44 | Dividers, list row separators |
| `--line-table-row` | #F1F1F5 | #26263C | Table row separators |
| `--line-strong` | #D0D0DC | #33334D | Header divider, kbd border (light) |
| `--positive` | #3F2FD0 | #B3A6FF | Money owed **to the viewer**: "+" impact, "gets back", "owes you", "You paid" legend |
| `--positive-soft` | #F0EEFF | #2A2A4A | Selected table row, selected menu item, "lent" strip, "Fully assigned" strip |
| `--positive-tag-bg/fg` | #ECE9FF / #3F2FD0 | #2F2A5C / #CFC7FF | "Payment" tag |
| `--negative` | #B4420A | #FF9A6B | Money **the viewer owes**: "−" impact, "owes", Delete |
| `--negative-soft` | #FFF1E6 | #3A2418 | "Left to assign" strip, "Your share" strip |
| `--accent` | #4A35E8 | #4A35E8 | Switch "on" track, checked checkbox |
| `--bar-share` / `--bar-extra` / `--bar-track` | #14142B / #6A55F5 / #E9E9F0 | #F2F2F8 / #7C68FF / #33334D | Share-of-spend bar |
| `--button-primary-bg/fg` | #14142B / #FFFFFF | #F2F2F8 / #0F0F1A | Add expense, Save, Edit, selected filter chip |
| `--button-disabled-bg/fg` | #E0E0EA / #5C5C73 | #26263C / #A6A6BD | Blocked Save button |
| `--you-avatar-bg/fg` | #14142B / #FFFFFF | #F2F2F8 / #14142B | The "You" avatar in tables and lists |
| `--hero-owe-chip-bg` | #14142B | #0F0F1A | Chip for a person the viewer owes, inside the gradient |
| `--overlay` | rgba(20,20,43,.45) | rgba(0,0,0,.6) | Scrim behind phone sheets |

**Why violet and orange, not green and red:** positive is indigo-violet and negative is burnt orange. They differ in lightness as well as hue, so they stay distinguishable for red-green colour blindness and in greyscale. Every coloured amount also carries a sign or a word ("+", "−", "owes", "gets back"), so colour is never the only signal.

**Contrast:** all text roles meet WCAG AA (4.5:1) on their usual background in both themes. `--text-muted` is the lightest text allowed on `--surface`; don't go lighter. White text on the gradient is AA across the whole card.

## Brand gradient

```
--gradient-glow:            /* wide cards (desktop hero) */
  radial-gradient(70% 140% at 100% 0%, #A02C88 0%, rgba(160,44,136,0) 65%),
  radial-gradient(80% 140% at 0% 100%, #2A1FB0 0%, rgba(42,31,176,0) 70%),
  #4A35E8;
--gradient-glow-compact:    /* phone hero, composer input card */
  radial-gradient(90% 120% at 100% 0%, #A02C88 0%, rgba(160,44,136,0) 60%),
  radial-gradient(100% 120% at 0% 100%, #2A1FB0 0%, rgba(42,31,176,0) 70%),
  #4A35E8;
```

- The gradient is the **only** gradient in the product, and it is reserved for the viewer's money: the hero balance card and the composer's amount card. Don't use it on buttons or decoration.
- It is the same in both themes. Only its shadow changes.
- Content on the gradient: white text; tiles/chips/inputs at `rgba(255,255,255,0.14–0.16)`; avatars are solid white circles with the initial in #2A1FB0.
- Phone board 01/02 draws the magenta stop as #B8389A. Use **#A02C88** everywhere (it's what every other board uses, and white text contrast is better). See docs/07.

## Typography

One family: **Plus Jakarta Sans**, weights 400/500/600/700/800. In Next.js load it with `next/font/google` (`Plus_Jakarta_Sans`, `subsets: ['latin']`, weights above, `display: 'swap'`) and expose it as `--font-sans`. All money uses `font-variant-numeric: tabular-nums`.

| Token | Size / weight | Tracking | Where |
|---|---|---|---|
| hero | 60 / 800 (54 phone) | −0.03em, line-height 1.05 | Owed amount in the hero card |
| amount-input | 48 / 800 | −0.03em | Composer amount |
| detail-amount | 44 / 800 | −0.03em | Details panel amount |
| inspector-amount | 32 / 800 | −0.02em | Older inspector (boards 03/23) |
| page-title | 24 / 800 (20 phone) | −0.02em | Group name |
| panel-title | 20 / 800 (22 inspector) | −0.01em | Panel and expense titles |
| card-title | 17 / 800 (18 desktop Balances) | 0 | "Trip so far", "Settle-up plan", "Everyone" |
| body | 14 / 400–700 (15 phone) | 0 | Default |
| meta | 13 / 400–600 | 0 | Sub-lines, legends, status strips, chip names |
| small | 12 / 400–700 | 0 | Table headers (700), "bal." line, tags |
| label | 12 / 700 UPPERCASE | 0.06em | "INVOLVING YOU", "PAID FOR THE GROUP" |
| micro | 11 / 600 | 0 | "Viewing as" caption in the pill |

Weight carries hierarchy more than size: titles and money 700–800, names 600–700, meta 400–600.

## Spacing, radius, sizes

- 4px grid. Page padding is 24px on desktop and 16px on phone; cards use 20px (desktop) or 14–16px (phone) padding; cards sit 16px apart; buttons 8px apart.
- Radii: hero/desktop cards 24 · phone cards and menus 20 · hero chips and the split track 16 · tiles, strips, menu items 14 · inputs and split segments 12 · checkbox 7 · sheet top 28 · buttons, chips, search, segmented controls fully rounded.
- Controls: 44px is the minimum for anything tappable (header buttons, filters, search, pickers, menu items). Panel actions are 48px; the phone bottom bar is 52px; segment buttons are 40px inside a 4px-padded track (48 total).
- Avatars: 38 (hero chips) · 36 (phone rows, sheet items) · 32 (lists, menus, composer) · 28 (table cells, inline pills).

## Elevation (light only; dark has none except the glow and menus)

| Token | Value | Used on |
|---|---|---|
| `--shadow-button` | 0 1px 2px rgba(20,20,43,.08), 0 4px 12px rgba(20,20,43,.06) | White header buttons, search, viewing-as pill |
| `--shadow-card` | 0 1px 2px rgba(20,20,43,.06), 0 8px 24px rgba(20,20,43,.05) | Cards and panels |
| `--shadow-menu` | 0 16px 40px rgba(20,20,43,.18), 0 2px 6px rgba(20,20,43,.08) | Viewing-as menu (dark: 0 16px 40px rgba(0,0,0,.55) plus a 1px #33334D border) |
| `--shadow-glow` | 0 12px 28px rgba(74,53,232,.26) | Gradient card (dark: 0 12px 36px rgba(106,85,245,.35)) |

## Member avatar palette

Six colour pairs, each with a light-theme and dark-theme version (`--member-1…6-bg/fg`). Avatars show the member's first initial at 800 weight.

| Slot | Light bg / fg | Dark bg / fg | Sample member |
|---|---|---|---|
| 1 peach | #FFE3D3 / #5A2200 | #FFB38A / #4A1E00 | Jacky |
| 2 blue | #DCEBFF / #0B2B55 | #9CC9FF / #0B2B55 | Stephen |
| 3 pink | #FFDDEA / #4F0A2A | #FF9EC4 / #4F0A2A | Angus |
| 4 yellow | #FFEDBF / #4A3000 | #FFD166 / #4A3000 | Alvin |
| 5 mint | #D5F5EC / #063B33 | #7FE3D0 / #063B33 | Matthew |
| 6 lilac | #E4DDFF / #1D1147 | #B9A7FF / #1D1147 | Jonah |

- **Assignment must be stable.** A member keeps their colour across sessions and devices. Recommended: slot = (index of the member in ledger order, by `users.created_at`) mod 6, or a hash of `users.id` mod 6. The mockups follow ledger order.
- Two members with the same initial (Jacky/Jonah, Angus/Alvin) are told apart by colour. If a group grows past six, colours repeat. Consider two-letter initials when a colour and an initial collide.
- **The viewer is drawn differently in data rows:** in tables, lists and pickers the current viewer appears as the neutral "You" avatar (`--you-avatar-*`). In the viewing-as pill and menu, the viewer keeps their own colour, because there the point is *who* you are viewing as.

## Icons

Inline stroke icons on a 24 viewBox, stroke-width 2 (2.2–2.6 for the small chevron and tick), round caps and joins, `currentColor`. If the project has no icon set, `lucide-react` covers every glyph used: `chevron-left`, `chevron-down`, `chevron-right`, `search`, `x`, `check`, `users`. Decorative icons get `aria-hidden="true"`; icon-only buttons get an `aria-label`.

The group emoji (🍲, from `ledgers.emoji`) is the only emoji in the UI.

## Motion (not designed; suggested defaults)

`--dur-fast` 120ms (hover/press), `--dur-base` 180ms (segment and tab changes, accordion), `--dur-panel` 240ms (right panel swap, sheets, menu). Use `--ease-out` and respect `prefers-reduced-motion`. When the viewer changes, crossfade the numbers rather than animating them counting.
