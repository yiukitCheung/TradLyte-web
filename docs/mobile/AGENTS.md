# AGENTS.md — TradLyte Mobile App

> Operating manual for the agent building the **native mobile** version of TradLyte.
> Read this first, then `FEATURES.md` (what to build) and `PLAN.md` (the order to build it).

---

## 1. What TradLyte is

TradLyte is a **purpose-driven investing companion**. It is not a brokerage and does not execute trades. It helps a retail investor:

1. **Discover & analyze** stocks (screener, daily AI "top picks", per-stock detail with fundamentals + news + an AI read).
2. **Backtest strategies** without code (a guided builder + one-click presets that replay rules on real history).
3. **Track a portfolio** measured from the user's own entry price (manual holdings, not broker-synced).
4. **Set goals** tied to a real-life purpose, with an AI goal planner.
5. **Journal & reflect** — nightly debriefs, purpose reminders, regret logging, points/levels for consistency.

The emotional thesis throughout: **money is a means, not a trophy** — calm, deliberate, reason-driven decisions. Every screen should reinforce "remember *why* you invest," not "trade more."

This repo (`tradlyte-web`) is the **reference web app**. The mobile app should reach **feature parity** with it, adapted to native patterns.

---

## 2. Existing architecture (reuse as much as possible)

```
[ Mobile app (NEW) ]            [ Web app (this repo, reference) ]
        │                                  │
        ├──────────────┬───────────────────┤
        ▼              ▼                    ▼
   Supabase Auth   Supabase Edge Fns    Supabase Postgres (RLS)
                    │         │
         ┌──────────┘         └──────────┐
         ▼                               ▼
   market-proxy  ──►  AWS Serving API   ai-chat  ──►  MiniMax (Anthropic-compatible)
   (public market    (FastAPI/Lambda,   (LLM proxy)
    data + backtest)  see API_GUIDE.md)
```

- **Supabase** is the backend: Auth (email/password), Postgres (with Row-Level Security on every user table), and two **Edge Functions**:
  - `market-proxy` — proxies the AWS **Serving API** (picks, quotes, news, OHLCV, returns, backtest). The upstream API key is held in Edge secrets; the browser/app never sees it. Allowed paths: `/backtest`, `/market/*`, `/picks/*`.
  - `ai-chat` — proxies **MiniMax** (Anthropic-compatible `/v1/messages`). Expects `{ system, messages:[{role, content:[{type:"text", text}]}] }`, returns `{ text }`.
- **AWS Serving API** — documented in `/API_GUIDE.md` at repo root. **Read it.** Key endpoints: `/picks/today/metadata`, `/picks/{scan_date}/returns`, `/market/quote/{symbol}`, `/market/news/{symbol}`, `/market/ohlcv/{symbol}`, `/market/returns/{symbol}`, `POST /backtest`.

### What ports directly to mobile (high reuse)
Most of `src/lib/*` is **platform-agnostic TypeScript** with no DOM/React dependency — copy it almost verbatim:

| File | Purpose | Mobile note |
|---|---|---|
| `marketGateway.ts` | fetch wrapper to `market-proxy` | uses `fetch` + `import.meta.env` → swap env access |
| `marketApi.ts` | picks/quote/news/ohlcv/returns/backtest helpers | pure; reuse |
| `backtestUtils.ts`, `backtestRecipes.ts`, `backtestIndicators.ts`, `strategyDraft.ts` | strategy model + presets + payload builder | pure; reuse |
| `goalUtils.ts`, `journalUtils.ts`, `journalStreak.ts`, `rewards.ts`, `portfolioUtils.ts`, `regretUtils.ts` | domain logic | mostly pure; reuse |
| `aiChat.ts` | `requestAiChat` via `supabase.functions.invoke` | reuse |
| `purposeUtils.ts` | purpose/onboarding | **uses `localStorage`** → swap for AsyncStorage |

⚠️ **localStorage** appears in `purposeUtils.ts` (purpose cache, daily-quote index) and `regretUtils.ts` (legacy local regrets). React Native has no `localStorage` — replace with `@react-native-async-storage/async-storage` (or `expo-secure-store` for anything sensitive). Audit for `localStorage`, `window`, `document` before reusing.

### What must be rebuilt for native
- **All UI** (`src/pages/*`, `src/components/*`) — these are React-DOM + Tailwind + shadcn. Rebuild with native components.
- **Charts** — web uses `recharts` (DOM/SVG). Use `victory-native` or `react-native-svg-charts` + `react-native-svg`.
- **The educational visuals** (`StrategyLabVisuals.tsx`: candle patterns, indicator + exit SVGs) — they're plain SVG; **port to `react-native-svg`** (same path data, swap `<svg>`→`<Svg>`, `<rect>`→`<Rect>`, Tailwind fills → props/StyleSheet).
- **Routing** — web uses `react-router-dom`; use **`expo-router`** (file-based) and mirror the route names.

---

## 3. Recommended stack

- **Expo (React Native)** + **expo-router** (file-based routing mirrors the web's routes).
- **@supabase/supabase-js** — works in RN with `react-native-url-polyfill/auto` and `AsyncStorage` as the auth `storage`. Persist the session with SecureStore where possible.
- **NativeWind** (Tailwind for RN) — lets you carry the existing design tokens (see §4) into `tailwind.config.js` almost unchanged, so class names stay familiar.
- **react-native-svg** — for ported indicator/candle/exit visuals.
- **victory-native** (or `react-native-svg-charts`) — equity curve, price chart, portfolio value curve.
- **expo-notifications** — for the Notifications surface + cooldown/streak reminders.
- **expo-secure-store** / **AsyncStorage** — session + purpose cache.
- **@tanstack/react-query** (optional but recommended) — the web fetches ad-hoc in `useEffect`; mobile should centralize with React Query for caching, retries, and pull-to-refresh.

> Do **not** hardcode the platform stack if the user has a preference — confirm Expo vs bare RN, and NativeWind vs StyleSheet, before scaffolding.

---

## 4. Design system (carry it over)

Editorial **taupe/beige**, calm and serif-led. Map these into `tailwind.config.js` (NativeWind) or a theme file.

**Surfaces:** `#F4F2EF` (primary) · `#FBFAF8` (card) · `#ECE9E3` (sunken) · `#1A1A1A` inverse/ink
**Ink (text):** `#1A1A1A` primary · muted/secondary greys
**Accent gold:** `#C8B496` (gold) · `#A8915F` (gold-deep)
**Navy ink (primary action):** `#384F84` — primary buttons are **navy**, NOT gold
**Positive:** `#3E7C5A` · **Negative:** `#B0553F`
**Radii:** md 10 · lg 16 · full
**Fonts:** **Newsreader** (serif headings) · **Inter** (body) · **Funnel Sans** (caps/labels, uppercase, letter-spaced)

Conventions used everywhere on web (replicate):
- Cards: rounded-2xl, subtle border, card surface.
- Eyebrow labels: small, uppercase, letter-spaced, gold-deep.
- Headings: serif, medium weight.
- Micro-labels inside cards: caps font, tracking-wide, 11px.
- Selection state: 2px gold border + soft gold shadow.
- Motion is gentle (fades, draws) and respects reduced-motion. See `src/index.css` utilities (`stagger-fade`, `signal-draw`, `candle-grow`) — reimplement with `react-native-reanimated`.

There is a Pencil design file (`TradLyte-UX:UI.pen`) and `DESIGN.md` at repo root for the source-of-truth visuals.

---

## 5. Hard-won gotchas (do not relearn these)

1. **Returns API only computes horizons `1, 5, 21` trading days** (≈ day/week/month). `7/30/90/63/10/20` come back **null**. For "today's top picks" performance, call `/market/returns/{symbol}?horizons=1,5,21` and show 1d/5d/21d trailing returns. Response keys are `"1d"/"5d"/"21d"`.
2. **The latest pick scan is always fresh** (~1 day old): `pick_price == close_now` so `return_to_date ≈ 0`. Don't present that as "performance" — use trailing returns (above).
3. **Use `GOOG`, not `GOOGL`** in default ticker presets (avoid the non-voting/leverage confusion).
4. **AI is currently blocked by billing**, not code: the `ai-chat` edge fn auths fine but MiniMax returns `insufficient_balance_error (1008)`. AI features (goal planner, stock analysis, pick blurb) will 502 until the MiniMax account is funded. Build the UI to **degrade gracefully** (skeleton → friendly "AI offline" → manual fallback), exactly as the web does.
5. **Backtest constraints:** API Gateway integration timeout **30s**; keep `end_date − start_date ≤ ~5 years`; engine is **long-only**. Show a spinner and handle timeouts.
6. **MACD & true indicator crossovers are NOT expressible in the guided `StrategyDraft` model** — they run from component-level `BACKTEST_RECIPES`. Preserve this split: guided builder for RSI-threshold/MA-regime/candle/price; component recipes for MACD/EMA-cross/etc.
7. **All user tables are RLS-scoped to `auth.uid()`** — always query with the signed-in user; a stub/anon session returns empty (not an error). Plan empty states for every data surface.
8. **Market/picks data is public** (the `market-proxy` edge fn has `verify_jwt = false`); user data is private (RLS). News/picks/quotes work even before login.

---

## 6. Environment & secrets

App needs (client-safe, anon-level):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (a.k.a. publishable key) — for `@supabase/supabase-js`.

Server-held (already configured in Supabase, the app never sees them):
- `MARKET_API_BASE_URL`, `MARKET_GATEWAY_API_KEY` (on `market-proxy`).
- `MINIMAX_API_KEY`, `MINIMAX_MODEL`, `MINIMAX_BASE_URL` (on `ai-chat`).

The same Supabase project + edge functions serve both web and mobile — **no new backend work** is required for parity. Reuse the deployed functions.

---

## 7. How to verify your work

- Type-check + build on every change.
- The web app's pattern: drive a real device/simulator, exercise the actual flow (not just unit tests). Auth-gated screens need a logged-in session with seeded data (a test user with ≥1 holding, ≥1 goal, ≥1 journal entry) to see populated states.
- For data correctness, you can hit the edge functions directly with `curl` using the anon key as both `apikey` and `Authorization: Bearer` headers (this is how the web bugs were diagnosed) — e.g. `POST {SUPABASE_URL}/functions/v1/market-proxy?path=/picks/today/metadata`.
- There is **no test harness** in the web repo (no vitest/jest). If you add tests on mobile, scaffold the harness first; otherwise rely on type-check + build + on-device verification.

---

## 8. Working agreement

- **Parity first, then native delight.** Match the web's features and copy; then add native affordances (pull-to-refresh, haptics, push, biometric unlock, offline cache).
- **Reuse `src/lib/*`** instead of rewriting domain logic — port it into a shared module, fix the `localStorage`/env touchpoints, keep behavior identical.
- **Don't invent new design tokens.** Carry the taupe system over verbatim.
- **Honest data.** Never show a fabricated or 0% metric as real (this app's whole point is trustworthy reflection). If data is fresh/empty/unavailable, say so.
- **Confirm before scaffolding**: stack choices (Expo vs bare, NativeWind vs StyleSheet, React Query yes/no) and whether to target iOS first, Android first, or both.
