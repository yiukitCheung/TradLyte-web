# TradLyte Concept-Validation Survey & WTP Test Plan

> **Goal:** Directly test the one decisive unknown from the deep-research verdict —
> *will overwhelmed self-directed investors pay for the reflection/purpose/guardrail
> bundle, vs. charting, signals, or automation?* — plus the trust barrier and
> solution-fit risk.
>
> **Read this first:** A survey alone cannot "prove" willingness to pay. Stated WTP
> overstates real WTP by a wide, well-documented margin. This document therefore has two
> parts: **(A) the survey** (cheap, fast, finds the *problem* and *direction*), and
> **(B) a real-money validation test** (the only thing that actually proves payment).
> Treat the survey as the screen and the fake-door/pre-sale as the proof. Don't ship a
> roadmap off survey data alone.

---

## Part 0 — What we're trying to falsify (write the kill criteria *before* you run it)

Pre-commit to these so you can't rationalize a weak result afterward:

| Hypothesis | "Pass" bar (set before fielding) | If it fails |
|---|---|---|
| H1 — The pain is real & frequent | ≥50% of qualified respondents report regret/FOMO/overtrading at "often" or higher | Problem too rare → no market |
| H2 — They already spend on investing tools | ≥25% currently pay for *any* paid investing tool/app | Category may not monetize at all |
| H3 — The bundle beats single-purpose tools | Bundle concept scores higher appeal than the best single feature shown alone | No reason to exist vs. a journal app |
| H4 — Real WTP clears the floor | ≥8–12% click through to a real price page AND ≥30% of those start checkout/join waitlist-with-card | Subscription math won't work |
| H5 — Trust is surmountable | <40% cite "don't trust an unknown app with my data" as a blocking objection | Trust headwind kills adoption |

If H1/H2 pass but H3/H4 fail → you have a real problem but the wrong/unsellable solution.
That's the most likely failure mode given the research, so weight H3/H4 heavily.

---

## Part A — The Survey

**Target n:** 150–250 *qualified* responses (after screening). Below ~120 the WTP
segments get too thin to read. **Field to strangers, not your network** — friends/family
inflate every number. Good sources: Reddit (r/investing, r/Bogleheads, r/stocks),
Prolific/Respondi (paid panel, best data quality), investing Discords, X. Avoid only
posting where existing fans gather.

**Length:** keep under ~5 min. Randomize option order on attitudinal questions.

---

### Section 1 — Screener (qualify the target; disqualify the rest)

**S1. Do you personally pick and manage your own stock/ETF investments (not just a
robo-advisor or an advisor who does it for you)?**
- Yes, actively → continue
- Sometimes / a little → continue (tag "light")
- No, someone/something else manages it → **screen out** (but ask S1b)
- I don't invest → **screen out**

**S1b. (if screened out for delegation)** Would you *want* to manage your own investments
if you had better tools? Yes / No / Unsure
*(This sizes the "non-consumption" pool the disruption thesis depends on.)*

**S2. How long have you been investing?** <1 yr / 1–3 / 3–10 / 10+
**S3. Roughly how often do you check or trade?** Multiple times/day / Daily / Weekly /
Monthly / Rarely
**S4. Country:** US / Canada / Other (tag; the thesis is NA-focused)
**S5. Age band:** 18–24 / 25–34 / 35–44 / 45–54 / 55+

---

### Section 2 — Problem validation (test H1; do NOT mention TradLyte yet)

*Neutral framing — we want the pain unprompted, not led.*

**P1. In the last 12 months, how often have you experienced each? (Never / Rarely /
Sometimes / Often / Very often)**
- Sold something out of fear and regretted it later
- Bought something because it was hyped / I had FOMO
- Felt overwhelmed by too much information / too many opinions
- Lost track of *why* you bought a particular holding
- Made a trade you couldn't calmly explain afterward
- Traded more than you meant to

**P2. When you make an investing mistake, what usually causes it?** (pick up to 2)
Emotion/impulse · Too much conflicting info · No clear plan · Forgot my own reasoning ·
Following the crowd · Bad luck/market · I don't really make mistakes

**P3. How much does improving your investing *discipline/decisions* matter to you right
now?** Not at all → Extremely (5-pt)
*(P3 is your intensity filter — cross-tab everything against it.)*

---

### Section 3 — Current behavior & spend (test H2 — the single most predictive question)

**C1. Which do you currently use? (select all)** Brokerage research tools · TradingView
or similar charting · A trading journal (Edgewonk/TraderSync/TradesViz/Tradervue/etc.) ·
Stock newsletters/signals/Discords · Spreadsheet I built myself · Notes app / paper
journal · None of these

**C2. Do you currently *pay* for any investing tool, app, newsletter, or data?**
Yes / No
**C2a. (if yes)** Which, and roughly how much per month total? (open / banded:
<$10 · $10–25 · $25–50 · $50–100 · $100+)
*(Revealed baseline. People who already pay for tools are your only credible WTP pool —
segment all WTP answers by C2.)*

**C3. Have you ever tried keeping an investing journal or reflection habit?**
Never · Tried, didn't stick · Do it occasionally · Do it consistently
**C3a. (if "didn't stick")** Why did it stop? (open) *(Engagement-decay risk — this is the
falsifier from the research: journaling is often a resolution behavior.)*

---

### Section 4 — Concept & bundle test (test H3)

*Show the value prop plainly, once. Then test the parts.*

> **TradLyte is a calm investing companion (not a brokerage — it never places trades).
> It helps you: tie every holding to your real-life "why" and goals; reflect on decisions
> with prompts tied to what you actually did that day; remember *why* you regretted a past
> trade when you're about to make a similar one; track gains from *your own entry price*
> (not the crowd's); and test simple strategies in plain English — no code.**

**B1. How appealing is this overall?** Not at all → Extremely (5-pt)
**B2. How different is this from tools you already use?** Not at all → Very different
**B3. Which ONE feature is most valuable to you?** (forces the bundle apart)
- Purpose/goal-tied tracking
- Daily reflection prompts tied to my trades
- Regret memory / guardrails on repeat mistakes
- Entry-price (anti-FOMO) tracking
- Plain-English strategy backtesting
- None of these are valuable to me

**B4. Which ONE is *least* valuable / you'd never use?** (same list)
*(B3/B4 = a lightweight MaxDiff. If "backtesting" wins and the reflection features land in
B4, your differentiation isn't the differentiator — that reshapes the whole product bet.)*

**B5. Would you rather an app that…** *(tests solution-fit vs. the research's finding that
demand skews to automation)*
- …helps me reflect and decide better, but I stay fully in control
- …just tells me what to buy/sell (signals)
- …manages my investments automatically (AI/robo)
- …just shows me better charts and data

---

### Section 5 — Willingness to pay (test H4 — use a real method, not "would you pay?")

**Never ask a bare "would you pay $X?" — it's worthless.** Use both of these:

**Van Westendorp Price Sensitivity Meter** (4 questions → acceptable price band):
- W1. At what monthly price would this be **so expensive** you wouldn't consider it?
- W2. At what price would it be **expensive but you'd still consider** it?
- W3. At what price would it be **a good deal**?
- W4. At what price would it be **so cheap you'd doubt its quality**?
*(Plot the four curves; the band between the W1×W3 and W2×W4 intersections is your viable
range. Expect ~$5–15/mo given category comps — but let the data say.)*

**Gabor-Granger intent** (commitment-style, reduces inflation):
- G1. "If TradLyte cost **$X/month**, how likely are you to subscribe in the next 30
  days?" (Definitely / Probably / Might / Probably not / Definitely not) — randomly assign
  each respondent one price from {$4.99, $8.99, $12.99, $19.99}.
*(Only "Definitely" is signal — discount "Probably" by ~50%, ignore the rest. This is the
standard correction for stated-intent inflation.)*

**G2. Free vs. paid:** "Would you use a free version with limits?" Yes/No — and "what would
make you upgrade to paid?" (open). *(Most of this category lives on freemium; you need to
know the upgrade trigger.)*

---

### Section 6 — Trust & adoption barriers (test H5)

**T1. What would stop you from trying TradLyte? (select all)**
- Don't trust an unknown app with my financial info ← *the research's #1 barrier*
- Don't want to connect my brokerage / enter holdings manually
- Don't think I need it
- Already have tools that do this
- Cost
- Too much effort to keep up the habit
- Nothing — I'd try it

**T2. Would you trust this more if… (select all)** It never connects to my brokerage ·
It's from a known brand · Strong privacy guarantees · Free to start · Friends use it ·
Regulated/endorsed by a financial body

**T3. (optional, gold) Leave your email to join the early-access list.**
*(A real email with no incentive is a stronger signal than any Likert answer. Count the
opt-in rate — it's a mini-revealed-preference test inside the survey.)*

---

## Part B — The real-money / revealed-preference test (this is what actually proves H4)

Run this **in parallel or right after** the survey. It's the antidote to stated-WTP
inflation and the only thing that answers "will they *pay*."

1. **Fake-door pricing page (cheapest, ~1 week).** Put up a real landing page with the
   value prop and a real **Pricing** section ($9/mo, $19/mo, annual). The CTA ("Start free
   trial" / "Subscribe") leads to a "We're launching soon — leave your email" capture.
   Drive ~500–1,000 visitors via cheap ads or the same communities. **Measure: % who click
   a paid plan.** A click on a real price is worth 100 survey "yeses."
   - *Pass signal:* >8–12% of visitors click through to checkout intent.

2. **Smoke-test with a card (strongest).** Same page, but the CTA goes to a Stripe checkout
   that, at the final step, says "You're on the founding list — you won't be charged yet."
   **% who reach/start checkout** is the closest thing to proof short of charging.

3. **Pre-sale / founding member (definitive).** Offer a discounted annual founding plan and
   *actually charge* (with a money-back guarantee). Even 30–50 real payments validates the
   bundle more than 1,000 surveys.

4. **A/B the positioning** while you're at it: run the landing page as "reflection &
   discipline companion" vs. "plain-English backtesting & picks" vs. "purpose-driven
   investing." Whichever converts tells you which door the market actually walks through —
   directly resolving the B3/B4 differentiation question.

---

## Part C — How to read the results (don't fool yourself)

- **Cross-tab everything by C2 (already pays) and P3 (pain intensity).** WTP from people
  who already pay for tools *and* report high pain is your real market; WTP from everyone
  else is noise.
- **Discount stated intent hard:** count only "Definitely" on Gabor-Granger, halve
  "Probably." If even the discounted number supports the price band from Van Westendorp,
  that's a genuine green light.
- **Watch for the predicted failure mode:** strong P1 pain + weak B1/B5 toward reflection +
  B5 skewing to "manage it for me" = the research's warning confirmed (real problem, wrong
  solution). That's an early, cheap pivot signal — not a disaster.
- **The email opt-in rate (T3) and the fake-door click rate (Part B) outrank every Likert
  score.** If they conflict, believe the behavior, not the words.

## Suggested go/no-go

| Signal | Green | Yellow | Red |
|---|---|---|---|
| Pain (H1, P1 "often"+) | ≥60% | 40–60% | <40% |
| Already pay (H2, C2) | ≥30% | 15–30% | <15% |
| Bundle > single feature (H3) | Clear | Mixed | Single feature wins |
| Fake-door paid-click (H4) | ≥12% | 6–12% | <6% |
| Trust block (H5, T1) | <30% | 30–45% | >45% |

Three+ greens (incl. H4) → build with conviction. H4 red regardless of the rest →
the bundle doesn't sell at a price that works; rethink before investing more.
