# TradLyte — Competitive SWOT & Comparison (Product-Grounded)

> **What makes this version different.** This analysis is written from the inside of
> the codebase, not from the marketing site. Where an external analyst has to hedge
> ("appears to be," "may not yet be proven deep enough," "unclear trust infrastructure,"
> "if it lacks brokerage integration"), this document states what is *actually shipped*,
> what is *deliberately out of scope*, and — most usefully — where the product's own
> ambition outruns what's wired up today. Evidence is cited to files in this repo.

---

## 1. What TradLyte actually is (the correction the outside view misses)

TradLyte is **not** an early-stage "nice UX layer" trying to prove it's more than a
dashboard. It is a **feature-complete, production-grade web app** with real user data
(Supabase RLS-scoped tables), live market feeds, a working backtest engine, and a full
reflection loop. No mock data beyond test fixtures.

It is also, by deliberate design, **not a brokerage** — it never executes trades and has
no buy/sell button. The external analyst lists "no brokerage integration / exportable
workflows" as a weakness; in fact it's the product's founding constraint and the source
of its trust posture: *money is a means, not a trophy; remember why you invest.*

The honest one-line repositioning: TradLyte is an **editorial, purpose-anchored
reflection product wearing a trading-tool UI** — strongest where incumbents are weakest
(behavioral discipline, purpose, calm), and intentionally shallow where they are deep
(charting breadth, signals, execution).

### Shipped surface (verified)

| Capability | Status | Evidence |
|---|---|---|
| Auth: email/password + **SMS-OTP** validation factor, country picker, reset | ✅ Production | `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx` |
| Dashboard: live indices, portfolio table, daily picks, portfolio news, purpose card, journal insights | ✅ Production | `src/pages/UserDashboard.tsx` (~1450 lines) |
| Stock detail: live quote, 5 timeframes, 52-wk range, conviction score, watchlist, regret, inline strategy tester, news | ✅ Production | `src/pages/StockDetail.tsx` |
| Strategy Lab: no-code guided builder + 5–6 recipe templates, equity curve, 6 metrics, trade log, save/replay | ✅ Production | `src/pages/StrategyBuilder.tsx`, `src/lib/strategyDraft.ts` |
| Goals: purpose-tied timeline, auto-generated milestones, monthly-contribution pace, AI planner (manual fallback) | ✅ Production | `src/pages/Goals.tsx`, `src/lib/goalUtils.ts` |
| Journal: 3-field debrief tied to the day's portfolio moves, purpose-anchored prompts, streaks, points/levels | ✅ Production | `src/pages/Journal.tsx`, `src/lib/journalUtils.ts` |
| Indicator Lab: 5 interactive, drag-to-understand lessons, math unit-tested | ✅ Production | `src/components/education/`, `src/lib/indicators.ts` |
| Regret system: record reason, pattern-match by symbol/industry, warn on similar stocks, seed journal | ✅ Production | `src/lib/regretUtils.ts`, `src/components/RegretWarning.tsx` |
| Financial-health vault: client-encrypted (PBKDF2) income/expense → goal funding projection | ✅ Production | `src/pages/Profile.tsx`, `FinancialHealthTab` |
| AI (goal planner / research) | ⚠️ Billing-blocked, degrades gracefully | `src/lib/aiChat.ts` (MiniMax `insufficient_balance`) |
| Settings / Notifications / Admin / Support | ❌ Stubs | route placeholders |
| Trade execution | ❌ N/A by design | not a brokerage |

---

## 2. Competitive landscape

The market is several categories, not one. TradLyte sits in a lane the incumbents don't
actually contest.

| Competitor | Core positioning | Best for | Where TradLyte differs (fact-based) |
|---|---|---|---|
| **TradingView** | Broad multi-asset charting, 100+ indicators, Pine Script, social/community | General technical analysis, any asset | TradLyte ships ~7 core indicators and **no scripting**; it instead wires backtests into journaling, goals and purpose — a loop TradingView has no equivalent for |
| **TradingLite** | Order-flow, liquidity heatmaps, microstructure | Scalpers, crypto order-flow traders | TradLyte has **no intraday data in backtests** (daily/Fibonacci bars only) and doesn't try to — it targets calm, long-horizon reflection, not microstructure |
| **Tradytics** | AI + options flow + unusual activity + signals | Options traders, signal seekers | TradLyte is **long-only, equities-only, no options/Greeks/flow**; its "AI" is a goal planner, not a signal engine. Opposite promise: *make better decisions* vs *find more opportunities* |
| **Brokerage-native (Fidelity/Schwab/E*TRADE/TD)** | Research + screening + alerts + **execution** in-account | Zero-switching-cost convenience | TradLyte **never executes** and tracks holdings by **manual entry from your own entry price** — anti-FOMO framing brokerages structurally can't offer (they're paid on activity) |
| **TradLyte** | Noise reduction, plain-language backtests, purpose-anchored journaling, regret guardrails | Overwhelmed self-directed investors who want discipline | Real moat is the **reflection layer**, not feature breadth |

---

## 3. TradLyte SWOT

### Strengths (what's genuinely built and defensible)

1. **Purpose-anchored reflection is real, not copy.** Onboarding *requires* a primary
   goal and a written purpose statement (`profiles.purpose_statement`), and that intent
   is threaded into the daily journal debrief. `buildDebriefQuestions()` generates
   prompts tied to *that day's actual portfolio moves* ("Closing AAPL — was that your
   plan, or the moment?"), and `purposeReflectionQuestion()` anchors a final prompt to
   the user's stated *why*. (`src/lib/journalUtils.ts`, `src/lib/purposeUtils.ts`)
2. **The regret system is a genuine behavioral guardrail no brokerage offers.** Mark a
   holding "I regret this" with a reason; `checkSimilarRegrets()` then surfaces that
   memory automatically when you later view the same symbol *or same industry*, and
   routes you to a seeded journal reflection. (`src/lib/regretUtils.ts`)
3. **Entry-price anchoring is structural, not cosmetic.** `buildPortfolioCurve()` builds
   value forward from each holding's actual `purchase_date`, and every holding is framed
   against *what you paid* — deliberately anti-FOMO. (`src/lib/portfolioUtils.ts`)
4. **No-code strategy building that teaches.** Every strategy renders as a readable
   English sentence with glossary-linked terms ("On the daily chart, when RSI(14) is
   above 50, and a green candle prints, buy. Exit at +10% or a 5% stop."), backed by a
   real `/backtest` engine with equity curve, Sharpe, drawdown, win rate and trade log.
   (`src/lib/strategySentence.ts`, `src/pages/StrategyBuilder.tsx`)
5. **Milestone pedagogy.** Goals auto-decompose into *meaning-aware* milestones (an
   emergency fund becomes "$1k starter → 3-month → full 6-month coverage," not generic
   25/50/75%). (`src/lib/goalUtils.ts`)
6. **Trust posture baked into the architecture.** Market/picks/news are public; all user
   data is RLS-scoped to `auth.uid()`; the product never fabricates a metric (the latest
   pick scan is ~1 day old, so the UI uses *trailing* returns rather than presenting ~0%
   as "performance"). The CLAUDE.md rule "never show a fabricated or 0% metric as real"
   is enforced in code. The outside view called trust infrastructure "unclear"; it's
   actually a first-class design constraint.

### Weaknesses (the real ones — visible only from inside)

1. **Purpose-alignment nudges at trade time are dead code.** `checkPurposeAlignment()`
   exists in `src/lib/purposeUtils.ts` but is **never invoked**. You can add any stock
   to the portfolio without a "does this fit your why?" check (except the modal on the
   add-flow). The product's headline promise is under-enforced at the exact moment of
   decision.
2. **No continuous purpose surfacing on the main dashboard.** Goal progress vs. portfolio
   lives on the Goals page; the primary dashboard leads with winners/losers cards
   ("Doing great" / "Needs attention") — *performance-centric* framing that quietly
   contradicts "money is a means."
3. **No behavioral-pattern intelligence.** Regret data is captured but never aggregated:
   there's no "you've panic-sold tech three times — here's your pattern." The "discipline
   score" measures *did you journal*, not *did you behave with discipline*.
4. **No portfolio risk lens.** No concentration warning, no sector allocation, no
   diversification or drawdown-stress view — a missed, on-brand opportunity ("you said
   family security is the goal; are you comfortable with 50% in one stock?").
5. **Gamification is thin and partly fake.** Points accrue *only* from journaling
   (25/entry); the Profile "milestones" ("Logged 300 trades," "30-day streak") are **UI
   mockups not wired to any backend unlock.** (`src/lib/rewards.ts`, `src/pages/Profile.tsx`)
6. **AI is offline.** Goal planner and research depend on MiniMax, currently returning
   `insufficient_balance` — a billing, not code, problem, but it means an advertised
   surface is degraded today.
7. **Manual portfolio entry.** No brokerage sync means holdings/`current_amount` can
   drift from reality; goals don't auto-update from portfolio value.
8. **Genuine depth ceiling for serious traders** (this part the outside view got right):
   ~7 indicators, **long-only**, daily/Fibonacci bars only, ≤~5-year backtests, 30s
   timeout, no shorts/options/leverage, no Pine-style scripting, no slippage model.

### Opportunities

1. **Activate what's already half-built.** Wire `checkPurposeAlignment()` into the add-
   to-portfolio flow; promote goal-progress to a primary dashboard widget; aggregate
   regrets into a pattern view. These are *small* lifts against existing data that would
   convert the brand promise into felt product behavior.
2. **Own "decision clarity for self-directed investors"** as a category, rather than
   competing on features. The reflection loop (backtest → journal → goal → regret) is a
   defensible combination no incumbent assembles.
3. **On-brand portfolio guardrails** (concentration, purpose-fit) in a *calm,
   reflective* voice — differentiation precisely because brokerages monetize activity.
4. **Behavioral-coaching AI** once billing is restored: the journal + regret + goal data
   is an unusually rich substrate for "here's your pattern, here's the lesson."
5. **Ride the documented retail appetite for AI that *filters and explains* rather than
   signals** — TradLyte's "trustworthy simplification" thesis fits that demand better
   than signal-first tools.

### Threats

1. **Incumbent scale & switching friction.** TradingView's community/breadth, brokerage
   zero-switch convenience, and Tradytics/TradingLite niche depth are all hard to
   out-feature — and TradLyte shouldn't try.
2. **Category confusion.** If "purpose-first / money as a means" reads as abstract rather
   than as concrete tasks (journal a trade, check a goal's pace, see a regret), curiosity
   won't convert to retention. The thesis must keep showing up as *features*, not slogans.
3. **The aspiration/shipped gap becomes the story.** Dead alignment code, mockup
   milestones, and offline AI are survivable individually; together they risk the product
   feeling like it *says* more than it *does*. Closing the gap (Opportunity #1) is the
   direct defense.
4. **Manual data entry erodes trust over time** if a holding's numbers visibly diverge
   from a user's brokerage — the one place this otherwise-honest product can look wrong.

---

## 4. Head-to-head

**TradingView vs TradLyte.** TradingView wins on breadth, scripting, multi-asset and
community. TradLyte wins on *focus and discipline*: a clean path from market data to a
reflected decision, with the trade journaled and tied to a life goal. Don't chase Pine
Script; deepen the loop TradingView doesn't have.

**TradingLite vs TradLyte.** Different audiences entirely — order-flow microstructure vs.
calm long-horizon reflection. TradLyte has no intraday backtest and shouldn't fight on
visualization depth; emphasize calmer interpretation.

**Tradytics vs TradLyte.** Tradytics finds opportunities (options flow, signals);
TradLyte improves decisions and habits. Long-only equities + a goal planner is a
deliberately different promise from an AI signal engine.

**Brokerage-native vs TradLyte.** The toughest competitor (it sits on the trade and
already bundles research). But brokerages are cluttered, activity-incentivized, and
inconsistent on mobile. TradLyte's wedge is to be the *calm reflection layer* on top —
not a brokerage replacement, a brokerage conscience.

---

## 5. Strategic implications

1. **Don't position as a better TradingView/Tradytics.** That's a feature arms race
   TradLyte loses. Own **"decision clarity for self-directed investors"** — strategy
   journaling, plain-language backtests, purpose/goal alignment, regret guardrails.
2. **Ship the thesis you already wrote.** The single highest-leverage move is closing the
   aspiration gap: invoke `checkPurposeAlignment`, surface goal-progress on the
   dashboard, aggregate regrets, and wire real milestones. The data already exists.
3. **Add one on-brand risk lens** (concentration vs. goals) — credible because it's
   framed as reflection, not a signal.
4. **Restore AI** to unlock the planner and, later, behavioral coaching grounded in the
   journal/regret/goal substrate.
5. **Keep the honesty.** Trailing-return discipline and "never show a fabricated metric"
   are real trust assets — lean into them in copy *and* keep manual-entry data visibly
   user-owned.

---

## 6. Bottom line

The external analyst's instinct was right — TradLyte's edge is clarity, discipline, and a
better decision workflow, not technical depth — but the framing was too cautious. The
reflection layer (purpose onboarding, portfolio-aware journaling, regret guardrails,
entry-price anchoring, milestone goals) is **already shipped and is the moat.** The real
risk isn't that the product is too shallow to matter; it's that its *most differentiating
ideas are only half-wired* (dead alignment code, mockup achievements, dashboard that
leads with performance not purpose, offline AI). TradLyte wins by **finishing what it
started** and owning "decision clarity," not by adding indicators to chase TradingView.
