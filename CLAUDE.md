# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TradLyte web — a **purpose-driven investing companion** (not a brokerage; it never executes trades). It helps retail investors discover/analyze stocks, backtest strategies without code, track a portfolio from their own entry price, set purpose-tied goals, and journal/reflect. The emotional thesis runs through every screen: *money is a means, not a trophy* — reinforce "remember why you invest," never "trade more." This repo is also the **reference implementation** for a separate native mobile app (see `docs/mobile/AGENTS.md`).

Originally scaffolded by Lovable (`vite_react_shadcn_ts`); `lovable-tagger` runs only in dev mode.

## Commands

```sh
npm run dev          # Vite dev server on http://localhost:8080 (host "::")
npm run build        # production build
npm run build:dev    # build with development mode (keeps lovable-tagger)
npm run lint         # eslint .
npm run preview      # preview a built bundle
```

There is **no test harness** (no vitest/jest). Verify changes with `npm run build` (type-check happens at build) + `npm run lint` + driving the real app in a browser. To verify data correctness, hit the edge functions directly with curl using the anon key as both `apikey` and `Authorization: Bearer` headers, e.g. `POST {SUPABASE_URL}/functions/v1/market-proxy?path=/picks/today/metadata`.

TypeScript is **loose** (`strict: false`, `noImplicitAny: false`, unused locals/params allowed) — don't expect the compiler to catch much.

## Architecture

**Stack:** Vite + React 18 + TypeScript, React Router (`react-router-dom`), TanStack Query, Tailwind + shadcn/ui (Radix primitives in `src/components/ui/`), `@supabase/supabase-js`. Path alias `@/*` → `src/*`.

**Backend is entirely Supabase** (project `vdtjgjhfcmrpbuoabyup`). There is no custom server in this repo. Three layers:

1. **Supabase Auth** — email/password sign-up, but phone (SMS OTP) is the validation factor. `signUp` sends both email+password and phone; a session is only returned after `verifyPhone` confirms the SMS OTP. All auth logic lives in `src/hooks/useAuth.tsx`.
2. **Supabase Postgres** — every user table is **RLS-scoped to `auth.uid()`**. Always query as the signed-in user; an anon/stub session returns *empty results, not an error*. Plan empty states for every user-data surface. Migrations live in `supabase/migrations/`; generated types in `src/integrations/supabase/types.ts` (do not hand-edit — it's generated).
3. **Supabase Edge Functions** (`supabase/functions/`):
   - `market-proxy` — proxies the AWS Serving API for **public** market data + backtest. `verify_jwt = false` (data is public; the real auth boundary is the upstream gateway key held in Edge secrets, never sent from the browser). Allowed paths only: `/backtest`, `/market/*`, `/picks/*` (enforced client-side in `marketGateway.ts:assertAllowedPath`).
   - `ai-chat` — proxies **MiniMax** (Anthropic-compatible `/v1/messages`). `verify_jwt = true` (per-user). Called via `requestAiChat` in `src/lib/aiChat.ts`.
   - `polygon-proxy` — public delayed intraday price proxy (Polygon), key injected server-side.

**Data flow:** UI → `src/lib/*` helpers → `marketGatewayFetch` (`src/lib/marketGateway.ts`) / `requestAiChat` → Edge Function → AWS Serving API / MiniMax / Polygon. The AWS Serving API (FastAPI/Lambda) is **fully documented in `API_GUIDE.md` at repo root — read it** before touching market/backtest code (picks, quotes, news, OHLCV, returns, and the full backtest composition model live there).

### Code layout

- `src/pages/*` — route-level screens (one per route in `src/App.tsx`).
- `src/components/*` — shared components; `ui/` is shadcn/Radix primitives, plus feature subdirs (`landing/`, `strategy-builder/`, `onboarding/`).
- `src/lib/*` — **platform-agnostic domain logic** (no DOM/React): the `marketApi`/`marketGateway` fetch layer, the backtest model (`backtestUtils`, `backtestRecipes`, `backtestIndicators`, `strategyDraft`), and domain utils (`goalUtils`, `journalUtils`, `journalStreak`, `rewards`, `portfolioUtils`, `regretUtils`, `purposeUtils`). Keep this layer DOM-free — it is ported verbatim to mobile.
- `src/hooks/*` — `useAuth` (session), `useRequireOnboarding` (redirects to `/auth` when signed out, `/onboarding` when setup incomplete), plus feature hooks.
- `src/integrations/supabase/` — generated client + types.

Routing is declared centrally in `src/App.tsx`; add custom routes **above** the catch-all `*` route. App is wrapped in `QueryClientProvider` → `TooltipProvider` → toasters → `BrowserRouter`.

## Domain gotchas (do not relearn)

1. **Returns API only computes horizons `1, 5, 21` trading days.** `7/30/90/63/10/20` come back null. For "today's top picks" performance use `/market/returns/{symbol}?horizons=1,5,21` (response keys `"1d"/"5d"/"21d"`).
2. **The latest pick scan is ~1 day old**, so `pick_price ≈ close_now` and `return_to_date ≈ 0`. Don't present that as "performance" — use trailing returns.
3. **AI is currently blocked by billing, not code.** `ai-chat` authenticates fine but MiniMax returns `insufficient_balance_error (1008)` until the account is funded — AI features 502. Build UI to **degrade gracefully** (skeleton → "AI offline" → manual fallback).
4. **Backtest constraints:** API Gateway integration timeout is **30s**; keep `end_date − start_date ≤ ~5 years`; the engine is **long-only**. Show a spinner and handle timeouts.
5. **MACD & true indicator crossovers are NOT expressible in the guided `StrategyDraft` model** — they run from component-level `BACKTEST_RECIPES`. Preserve this split: guided builder handles RSI-threshold/MA-regime/candle/price; component recipes handle MACD/EMA-cross/etc.
6. Use `GOOG`, not `GOOGL`, in default ticker presets.
7. Market/picks/news data is **public** (works before login); user data is **private** (RLS). Never show a fabricated or 0% metric as real — this app's whole point is trustworthy reflection; if data is fresh/empty/unavailable, say so.

## Design system

Editorial **taupe/beige**, calm and serif-led — full source of truth in `DESIGN.md` and the Pencil file `TradLyte-UX:UI.pen` (open `.pen` only via the `pencil` MCP tools, never Read/Grep). Tokens live in `tailwind.config.ts`. Key conventions: primary action buttons are **navy** (`#384F84`), NOT gold (gold `#C8B496` is accent only); fonts are Newsreader (serif headings) / Inter (body) / Funnel Sans (uppercase letter-spaced labels); cards are rounded-2xl with a subtle border. Don't invent new design tokens. Motion is gentle and respects reduced-motion (see utilities in `src/index.css`).

## Environment

Client-safe vars (in `.env`, see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Server-held secrets (configured on the Supabase project, never in this repo): `MARKET_API_BASE_URL` + `MARKET_GATEWAY_API_KEY` (on `market-proxy`); `MINIMAX_API_KEY` / `MINIMAX_MODEL` / `MINIMAX_BASE_URL` (on `ai-chat`). The Supabase client throws a descriptive error at startup if the two `VITE_` vars are missing — restart the dev server after editing `.env`.
