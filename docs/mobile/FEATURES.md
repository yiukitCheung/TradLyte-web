# FEATURES.md — TradLyte Mobile App

> Complete feature inventory for parity with the web app. Each screen lists its purpose,
> elements, data sources, and states. Web reference paths are in `(parens)`.
> Read alongside `AGENTS.md` (context) and `PLAN.md` (build order).

Legend: 🟢 build for v1 · 🟡 nice-to-have · ⛔ "Not available yet" (keep the placeholder, don't build)

---

## Navigation model

Web routes → suggested mobile structure (bottom tab bar + stacks):

| Tab | Screens |
|---|---|
| **Home** | Dashboard → Stock Detail (push) |
| **Lab** | Strategy Lab (guided + presets + results) |
| **Goals** | Goals timeline + AI planner |
| **Journal** | Journal / debrief |
| **More** | Profile, Settings, Notifications, Help Center, About |

Auth/onboarding live outside the tab bar (modal/stack). Web routes for reference: `/`, `/about`, `/auth`, `/onboarding`, `/dashboard`, `/strategy-builder`, `/goals`, `/journal`, `/stock/:symbol`, `/profile`, `/settings`, `/support`, `/notifications`.

---

## 1. 🟢 Auth & Onboarding (`/auth`, `/onboarding`)

- **Sign in / Sign up** — Supabase email/password (`useAuth`: `signUp`, `signIn`, `signOut`). On mobile add: persisted session, optional biometric unlock.
- **Purpose onboarding** (`PurposeOnboarding`) — multi-step: pick a primary goal, write a purpose statement, optional experience/horizon/risk, optional first goal. Writes to `profiles` (`saveOnboardingToProfile`) and mirrors a flag in auth metadata. Source of truth for "onboarding complete": `resolveOnboardingComplete()` (Supabase profile → metadata → activity backfill).
- **Guard:** signed-in but not onboarded → route to onboarding (`useRequireOnboarding`).

States: loading, error (auth failure toast), success → dashboard.

---

## 2. 🟢 Dashboard / Home (`/dashboard`, `UserDashboard.tsx`)

The post-login hub. "Understand everything at a glance."

- **Greeting hero** — time-of-day greeting + a one-line portfolio summary; ticker search bar; popular presets `["AAPL","NVDA","TSLA","MSFT","AMZN","GOOG"]` (note **GOOG**).
- **Markets at a glance** — 5 index tiles (SPY/QQQ/DJIA/GLD/USO) via `fetchDashboardIndices` (`/market/quote` + `/market/returns?horizons=1`).
- **Portfolio value card** — current value + gain-since-entry badge; **real value curve** built from each holding's OHLCV (`fetchOhlcvSeries` per holding → `buildPortfolioCurve` in `portfolioUtils.ts`); period toggles **6M / YTD / 1Y / All** (TimePeriod). Empty/loading/"price history unavailable" states.
- **Winners / losers strip** — "Doing great" + "Needs attention" from holdings (`splitWinnersLosers`).
- **Holdings table** — per holding: symbol, type, entry, current, qty, gain%, momentum (High/Steady/Soft from a gain-derived score — **not** buy/sell advice). Per-row **⋮ action menu**: **Mark as sold** (delete row), **I regret this** (→ regret flow, §below), **Remove from portfolio** (delete row). Optimistic update + rollback.
- **Today's Top Picks** — `fetchDashboardPicks` (Vegas-channel scan). Featured pick + ranked list, sector filter, and a **trailing-return toggle 1D / 1W / 1M** (→ `/market/returns/{symbol}?horizons=1,5,21`, keys `1d/5d/21d`). Each row shows "past day/week/month". Featured pick gets an AI one-liner (`requestAiChat`, degrades if AI offline).
- **Portfolio news** — latest headlines across held symbols (`fetchMarketNews` for top-5 holdings by value, sorted by `publishedAt` desc, capped 6). `rel=noopener` external links → open in in-app browser on mobile.
- **Purpose card** — the user's `purpose_statement` (or "Set your purpose" CTA).
- **Journal insights** — entries count, day streak (`consecutiveJournalDays`), avg mood (`averageMood`), level + points (`rewards.ts`: +25/entry).
- **Cooldown nudge** — when the biggest winner is up ≥15%, a gentle "wins tempt overtrading" prompt (gated by `useCooldown`).
- **Reflections preview** — 3 most recent `journal_entries`.

Regret flow (shared): two-step dialog → pick a reason (`REGRET_REASONS`) + optional note → `addUserRegret` (writes `user_regrets` + `behavior_logs`) → invite journaling → deep-link to Journal with `?reflect=regret&symbol=X` which seeds a reflection prompt.

States: every data block has loading + empty (no holdings / no news / no journal) + error.

---

## 3. 🟢 Stock Detail (`/stock/:symbol`, `StockDetail.tsx`)

- **Header** — symbol, company name, price, period change.
- **Price chart** — OHLCV history (`fetchOhlcvSeries`) with period toggles (1D/6M/YTD/1Y/5Y); 52-week range (`compute52WeekRange`).
- **Fundamentals** — open/high/low/volume/market cap/exchange/industry from `/market/quote` (the metadata call).
- **TradLyte AI read** — opening analysis + a follow-up chat (`requestAiChat` with `ANALYST_SYSTEM_PROMPT`). Context includes quote metadata + recent news headlines. Degrades to a static fallback when AI is offline.
- **News** — `fetchMarketNews(symbol)`.
- **Add to portfolio** — dialog: entry price + quantity → insert into `user_portfolio`. Includes a purpose-alignment check + a "similar regret" warning (`checkSimilarRegrets`, `RegretWarning`) if the user has regretted this symbol/industry before.

---

## 4. 🟢 Strategy Lab (`/strategy-builder`, `StrategyBuilder.tsx`)

Educational, no-code backtesting. 4-step progress: **Lens → Entry → Exit → Results**.

- **Guided builder** (`GuidedStrategyFlow.tsx`):
  - **Setup (Lens):** No filter · Momentum (RSI threshold) · Trend (MA crossover regime).
  - **Trigger (Entry):** No extra rule · Candle pattern (9 patterns) · Price level crossover.
  - **Exit:** Bracket · Take-profit · Stop-loss · Trailing · Time-limit · Signal-flip (death cross).
  - Each choice has a **distinct animated visual** (`StrategyLabVisuals.tsx`): per-pattern candle drawings (hammer, engulfing, doji, morning/evening star, …) with bias + meaning; per-exit annotated price-path diagrams. **Port these SVGs to `react-native-svg`.**
- **Preset recipes** (`BACKTEST_RECIPES`) — one tap loads + runs:
  1. **The Golden Cross** — SMA20>SMA50 + green candle + 5% stop.
  2. **RSI Oversold Bounce** — RSI<20 + green candle + 5% stop.
  3. **MACD Golden Cross** — MACD line crosses signal + 5%/12% bracket. (component-recipe only)
  4. **Fast EMA Cross (8/13)** — EMA8 crosses EMA13 + 4%/15% bracket. (component-recipe only)
  - Presets run from exact `components`; guided-compatible ones also load an editable draft. Editing any rule switches to "custom." Show the running preset's name on results.
- **Backtest run** — `POST /backtest` via `marketGatewayFetch`; inputs: symbol, starting capital, date range (presets 1M/3M/6M/1Y/YTD + custom). 30s timeout, long-only.
- **Results** — equity curve chart; metric tiles (total return, Sharpe, max drawdown, win rate, trades, final capital); trade log (entry/exit dates, prices, P/L, exit reason).

States: idle, running (spinner + pulsing curve placeholder), error (bad input / timeout), results.

---

## 5. 🟢 Goals (`/goals`, `Goals.tsx`)

- **Masthead** — total committed + on-pace/behind status; the user's `purpose_statement`.
- **AI goal planner** — a text box ("retire by 55 with $780k") → `requestAiChat` with a JSON-returning system prompt → `parseAiGoal` → prefills a confirm dialog (AI suggests, user confirms). Preset chips (Buy a home / Emergency fund / Kids' college) run the planner with a seed prompt. Planner is given the user's purpose + existing goals as context. Degrades to manual entry when AI is offline.
- **Manual add** — title, target amount, target date → `user_goals` insert; auto-generates milestones (`generateMilestones`).
- **Timeline** — goals as dated milestones, nearest first; per-goal progress bar + on-track/behind/complete status.
- **Contributions & pace** — estimated monthly to stay on pace (`computeMonthlyContributions`).

---

## 6. 🟢 Journal (`/journal`, `Journal.tsx`)

- **Level/streak hero** — date, streak (`consecutiveJournalDays`), level + points, tonight's prompt.
- **Why you trade band** — `purpose_statement` + a purpose-aligned reflection question (`purposeReflectionQuestion`) + link to goals. Seeds a reflection when arriving from a dashboard regret (`?reflect=regret&symbol=`).
- **Today's decisions** — portfolio moves today (`mapPortfolioToDecisions`), each marked reflected/pending.
- **Tonight's debrief** — prompts generated from today's activity (`buildDebriefQuestions`).
- **Today's log** — 3 labeled rows (pre-market intent / today's lesson / a small win) → saves to `journal_entries` (+25 points).

---

## 7. 🟢 Levels & Rewards (cross-cutting, `rewards.ts`)

+25 points per saved reflection; levels Starting → Building → Steady → Reflective → Disciplined → Seasoned…; streaks for consecutive days. Surface on Journal + Dashboard. Consider a dedicated "progress" screen on mobile.

---

## 8. 🟢 Help Center (`/support`, `Support.tsx`)

Data-driven sections + FAQ (already written — **reuse the content verbatim**, it's in `Support.tsx` as `SECTIONS` and `FAQS`):
- Applicable sections w/ 2–3 articles each: Getting started · Strategy Lab & backtesting · Goals & purpose · Journaling & debriefs · Levels & rewards.
- ⛔ Marked "Not available yet": Account & billing · Privacy & security · Connecting your broker.
- FAQ: 8 Q&A (points/levels, "is a backtest real?", add-to-portfolio, AI planner, broker N/A, paid plans N/A, privacy, not-financial-advice).
- Contact: chat (stub) + `mailto:support@tradlyte.com`.

---

## 9. 🟡 Profile / Settings / Notifications (`/profile`, `/settings`, `/notifications`)

- **Profile** — name, purpose, experience/horizon/risk from `profiles`; stats.
- **Settings** — preferences (cooldown toggle, focus mode); sign out. ⛔ billing/plan settings = "Not available yet".
- **Notifications** — on web it's a static list; on mobile, wire **expo-notifications** for real push: streak reminders, cooldown nudges, big-move alerts on holdings, "new top picks today."

---

## 10. ⛔ Explicitly NOT available (keep as placeholders)

- **Account & billing / paid plans** — TradLyte is free while building.
- **Privacy & security docs** — coming soon.
- **Broker connection / auto-sync** — manual portfolio only; on roadmap.

Surface these honestly ("Not available yet"), never as broken features.

---

## Data model (Supabase, all RLS-scoped to `auth.uid()`)

| Table | Key columns | Used by |
|---|---|---|
| `profiles` | `id`, `full_name`, `primary_goal`, `purpose_statement`, `investment_experience`, `time_horizon`, `risk_tolerance`, `onboarding_complete` | onboarding, purpose card, profile |
| `user_portfolio` | `id`, `asset_name`, `asset_type`, `purchase_price`, `current_price`, `quantity`, `strategy_*`, `created_at`, `updated_at` | dashboard, stock detail, journal |
| `user_goals` | `id`, `title`, `description`, `target_amount`, `current_amount`, `target_date`, `status`, `milestones (json)` | goals |
| `journal_entries` | `id`, `title`, `content`, `mood`, `tags[]`, `created_at` | journal, dashboard insights |
| `user_regrets` | `id`, `portfolio_id`, `stock_symbol`, `industry`, `reason`, `reason_code`, `notes`, `trade_date` | regret flow, stock detail warning |
| `behavior_logs` | `user_id`, `action_type`, `action_data` | analytics of regret/behavior |
| `user_roles` + `has_role()` | role gating | admin (not user-facing) |

## API surface (via `market-proxy`, see `/API_GUIDE.md`)

`/picks/today` · `/picks/today/metadata` · `/picks/detail` · `/picks/{scan_date}/returns` · `/market/quote/{symbol}` · `/market/news/{symbol}` · `/market/ohlcv/{symbol}` · `/market/returns/{symbol}` (**horizons 1,5,21 only**) · `POST /backtest` · `/screener/quotes`.

AI via `ai-chat`: `requestAiChat({ system, messages })` → `{ text }`.
