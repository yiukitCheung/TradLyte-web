# Financial Health page — implementation guide

> For the **mobile** app agent. Build the same Financial Health page the web app
> ships, sharing the same Supabase backend and encrypted data shape. This file
> describes the **page** (layout, behavior, math). For the **encryption
> contract** (KDF, cipher, key wrapping, recovery code, table columns) read its
> sibling **`FINANCIAL_HEALTH.md`** first — that part must be byte-compatible.

## What it is

A private **cash-flow workspace** in the Profile area. The user enters income and
categorized expenses; the app shows their monthly surplus + savings rate, then
**projects** how that surplus funds their goals over time and lets them plan big
purchases (house/car) that visibly set those timelines back. Everything is
zero-knowledge encrypted — we store ciphertext only.

Honesty rule (the product's whole point): **never show a fabricated number.** If
the vault is empty/locked or there's no surplus, say so plainly.

## States (route between these)

1. **Loading** — resolving auth + the vault row.
2. **Absent** — no vault yet → first-run **Setup** (confirm password → create vault → show one-time recovery code).
3. **Locked** — vault exists, no key this session → **Unlock** (password, or recovery code).
4. **Unlocked** — show the **Workspace** below.
5. **Error** — vault row failed to load → retry.

(Crypto/setup/unlock details + the seamless "unlock from login password" flow are in `FINANCIAL_HEALTH.md`.)

## Workspace layout (single scroll, in order)

1. **Save status + Lock button** — autosave indicator ("Saving… / Encrypted & saved"); a Lock button drops the key.
2. **Summary band** — Monthly income · Monthly expenses · Surplus (or shortfall) + savings rate · category breakdown (donut).
3. **Cash-flow projection chart** (see below).
4. **Income** list — rows of `[label] [amount] [frequency] [remove]`. Income keeps a label (e.g. "Salary").
5. **Expenses** list — rows of `[category] [amount] [frequency] [fixed?] [remove]`. **No name field** — the category identifies the row; same-category rows sum.
6. **Plan a big purchase** (see below).
7. Disclaimer: "Encrypted on your device · we store only ciphertext · for personal planning, not financial advice."

## Data model (the decrypted plaintext blob)

```jsonc
{
  "income":   [{ "id", "label", "amount": 0, "frequency": "weekly|biweekly|monthly|annual" }],
  "expenses": [{ "id", "category", "amount": 0, "frequency": "...", "fixed": true, "label"?: "..." }],
  "purchases":[{ "id", "kind": "house|car", "label", "targetDate": "YYYY-MM-01",
                 "downPayment": 0, "monthlyPayment": 0, "termMonths": 0 }],
  "meta": { "currency": "USD", "updatedAt": "ISO" }
}
```

- `expenses[].label` is **optional** — web omits it (category is the identity). Keep it nullable for parity.
- `purchases` is **optional** — older vaults won't have it; treat missing as `[]`.
- Expense categories: Housing, Transport, Food, Utilities, Insurance, Debt, Healthcare, Discretionary, Savings, Other.
- Derived values (monthly totals, surplus, savings rate, breakdown, projection) are **computed live, never stored.**

## Core math

**Normalize any cadence to monthly:**
```
weekly   → amount * 52 / 12
biweekly → amount * 26 / 12
annual   → amount / 12
monthly  → amount
```
`monthlyIncome = Σ toMonthly(income)`, `monthlyExpense = Σ toMonthly(expenses)`,
`surplus = monthlyIncome − monthlyExpense`, `savingsRate = surplus / monthlyIncome` (0 if income 0).

**Loan amortization** (mortgage & car — both are price − down → principal):
```
r = annualRatePct / 100 / 12
monthlyPayment = r === 0 ? principal / n : principal * r / (1 − (1+r)^(−n))      // n = termMonths
totalInterest  = monthlyPayment * n − principal
```

## Cash-flow projection chart (the centerpiece)

A line chart over future months with **three cumulative lines**:
- **Income** = `monthlyIncome × m`
- **Expenses** = cumulative monthly expense **plus** each planned purchase's down payment (one-time spike at its buy-month) **plus** that purchase's monthly loan payment for the months it's active
- **Savings** = Income − Expenses (the gap)

Walk month `m = 0..horizon`, accumulating income and expense; `savings[m] = income[m] − expense[m]`.

**Markers on the savings line:**
- **Goal** — at `y = remaining` (`max(0, target − current)`). Funded month = first `m` where `savings[m] ≥ remaining`; that month → funded-by date. If the line never reaches it → "Beyond this window" (e.g. a purchase made cash flow negative). If goal has a `target_date`, compare funded-date to it → On track / Behind.
- **Purchase** — at its buy-month, on the (now dipped) savings line. **Affordable** if savings *just before* the buy-month ≥ down payment; otherwise mark it **Short** (red).

**Buy-month** = whole months from now to `targetDate`, floored at 1 (a "buy now" lands next month).

**Honest empty state:** if `monthlyIncome ≤ monthlyExpense` (no surplus), draw **no line** — show "Once your income covers your expenses, your surplus grows here."

**Horizon:** long enough to reach the slowest goal (accounting for purchase drag) and show the last purchase; clamp to `[12, 120]` months.

> Web reference for exact behavior: `src/lib/financialProjection.ts` (`buildProjectionSeries`) and `src/lib/loanCalc.ts`. Mirror these.

This same chart also appears on the **Goals** page (read-only, no per-item list) when the vault is unlocked with a positive surplus.

## Plan a big purchase

Two calculators — **New home** and **New car** — each with: price, down payment,
rate, term (years), and a **target purchase month**. Each shows down payment ·
monthly payment · total interest. "**Add to my plan**" appends a `purchases[]`
entry (kind house/car). A "Your plan" list shows each with date / down / monthly
and a remove button. Adding/removing **persists** (it's in the encrypted blob).

The purchase then drives the chart simulation above: the down payment dips
savings at the buy-month; the monthly payment raises expenses afterward.

## Goal link

Goals are read **read-only** from the `user_goals` table (RLS-scoped). Use
`target_amount`, `current_amount`, `target_date`, `title`. The projection turns
the user's surplus into per-goal funded-by dates. Never write goals from here.

## Edge cases / rules

- Wrong password/code on unlock → decryption fails → "Couldn't unlock — check your password or use your recovery code."
- No surplus → no projection line (honest empty state), not a fake/flat line.
- A purchase that makes cash flow negative → goals legitimately show "Beyond this window." Don't hide it.
- Autosave is debounced (~700ms); keep edits on screen if a save fails and retry.
- Page relaunch loses the in-memory key → vault re-locks until the user unlocks again.

## Verify

Round-trip the crypto (encrypt→decrypt, wrong-key fails) per `FINANCIAL_HEALTH.md`,
then check the math: a $400k/6.5%/30y loan ≈ **$2,528/mo**; a goal with $16k
remaining at $2k/mo surplus funds in **8 months**; adding an unaffordable house
pushes that goal to "Beyond this window." Confirm a vault created on web decrypts
on mobile (and vice-versa) — that's the real proof.
