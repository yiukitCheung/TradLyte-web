# PLAN.md — TradLyte Mobile App build plan

> Phased roadmap to reach parity with the web app. Each phase has **Goal**, **Tasks**,
> and **Done when** (acceptance criteria). Build in order; later phases depend on earlier.
> Read `AGENTS.md` (context/gotchas) and `FEATURES.md` (what each screen contains) first.

**Default stack assumption:** Expo + expo-router + NativeWind + @supabase/supabase-js + react-native-svg + victory-native + React Query. **Confirm with the user before scaffolding** (see AGENTS §3). Confirm iOS-first / Android-first / both.

---

## Phase 0 — Project setup & foundation
**Goal:** A running Expo app that boots, authenticates, and shares the web's design tokens + domain logic.

Tasks:
- Scaffold Expo + expo-router (TypeScript). Bottom-tab layout: Home / Lab / Goals / Journal / More.
- Add NativeWind; port the taupe **theme tokens** from AGENTS §4 into `tailwind.config.js` (surfaces, ink, gold/gold-deep, navy primary, positive/negative, radii). Add the three fonts (Newsreader, Inter, Funnel Sans) via `expo-font`.
- Add `@supabase/supabase-js` + `react-native-url-polyfill/auto`; configure the client with **AsyncStorage** as auth storage and `SUPABASE_URL` / `SUPABASE_ANON_KEY` from env (`app.config.ts` `extra` or `expo-constants`).
- Create a **shared `lib/` module**: copy `src/lib/*` from the web repo. Replace every `localStorage` (in `purposeUtils.ts`, `regretUtils.ts`) with an async storage adapter, and replace `import.meta.env` access (in `marketGateway.ts`) with the RN env source. Audit for `window`/`document`.
- Add React Query provider.

**Done when:** app launches on a simulator, a hard-coded `requestAiChat`/`fetchDashboardPicks` call succeeds through the existing edge functions, and the theme renders with correct fonts/colors.

---

## Phase 1 — Auth & onboarding
**Goal:** Real sign-in, session persistence, and the purpose onboarding flow.

Tasks:
- Sign in / sign up screens (Supabase email/password via the ported `useAuth` logic). Persist + restore session; handle the auth-state listener.
- Onboarding flow (port `PurposeOnboarding` steps): primary goal, purpose statement, optional experience/horizon/risk, optional first goal → `saveOnboardingToProfile`.
- Route guard equivalent to `useRequireOnboarding` (signed-in + not onboarded → onboarding).
- Optional: biometric unlock on app resume.

**Done when:** a new user can sign up, complete onboarding (writes to `profiles`), and land on the dashboard; killing/reopening the app keeps them signed in.

---

## Phase 2 — Data layer & API client
**Goal:** A clean, cached data layer over the ported `lib/` + edge functions.

Tasks:
- Wrap the ported `marketApi.ts` helpers in React Query hooks (picks, indices, quote, news, ohlcv, returns, backtest).
- Centralize Supabase table reads/writes (portfolio, goals, journal, regrets) as hooks with proper invalidation (e.g. adding/removing a holding refreshes dashboard + journal).
- Add pull-to-refresh + offline cache (React Query persistence) for read surfaces.
- Implement the AI degradation pattern: loading → content → "AI offline" fallback (AI is billing-blocked today; see AGENTS §5.4).

**Done when:** every list/detail surface has a hook with loading/empty/error, and a holding mutation correctly refreshes dependent screens.

---

## Phase 3 — Dashboard (Home)
**Goal:** Full parity with the web dashboard (FEATURES §2) — the highest-value screen.

Tasks:
- Greeting hero + ticker search + popular presets (**GOOG** not GOOGL).
- Markets-at-a-glance tiles.
- Portfolio value **curve** (port `buildPortfolioCurve`; render with victory-native) + period toggles + gain badge.
- Winners/losers strip (`splitWinnersLosers`).
- Holdings list with the **⋮ action sheet**: Mark as sold / I regret this / Remove (optimistic + rollback). Use a native action sheet / bottom sheet.
- Today's Top Picks: featured + list, sector filter, **1D/1W/1M trailing-return toggle** (`/market/returns?horizons=1,5,21`), featured AI blurb.
- Portfolio news (newest-first across top holdings) → in-app browser on tap.
- Purpose card, journal insights, cooldown nudge, recent reflections.
- **Regret flow** bottom sheet (reason + note → `addUserRegret` → invite journaling → deep-link to Journal seeding a prompt).

**Done when:** with a seeded test user (≥2 holdings, news, journal entries) every block shows real data and correct empty states; sold/remove/regret all work and refresh the screen.

---

## Phase 4 — Stock Detail
**Goal:** Parity with FEATURES §3.

Tasks:
- Price chart + period toggles + 52-week range.
- Fundamentals from `/market/quote`.
- News list.
- AI read + follow-up chat (context = quote metadata + headlines; graceful offline).
- Add-to-portfolio sheet (entry price + qty) with purpose-alignment + similar-regret warning.

**Done when:** navigating from a pick or search opens the detail screen with live quote/chart/news; adding a holding appears on the dashboard.

---

## Phase 5 — Strategy Lab
**Goal:** Parity with FEATURES §4, including the educational visuals.

Tasks:
- **Port `StrategyLabVisuals.tsx` SVGs to `react-native-svg`** (candle patterns + indicator + exit diagrams; animate with reanimated).
- Guided 4-step flow (Lens/Entry/Exit) with choice cards + visuals; the pattern picker grid; reveal panels for parameters.
- 4 preset recipes (run from `BACKTEST_RECIPES` components; keep the guided-draft vs component-recipe split — MACD/EMA-cross are component-only).
- Backtest run (symbol/capital/date range; 30s timeout; long-only) → results: equity curve, metric tiles, trade log.

**Done when:** a preset runs end-to-end and shows a real equity curve + trades; the guided builder can construct + run a custom strategy; all candle/exit visuals render natively.

---

## Phase 6 — Goals & Journal
**Goal:** Parity with FEATURES §5–§7.

Tasks:
- **Goals:** masthead + purpose, AI planner box + preset chips (with purpose/goals context; manual fallback), manual add → `user_goals` + milestones, timeline, contributions/pace.
- **Journal:** level/streak hero, "why you trade" band (+ regret-seeded prompt via deep link), today's decisions, debrief prompts, today's log save (+25 points).
- Levels/streak surfacing (shared `rewards.ts`).

**Done when:** a user can create a goal (AI or manual), and write + save a journal entry that updates streak/points and appears on the dashboard.

---

## Phase 7 — Help, Profile, Settings, Notifications
**Goal:** Parity with FEATURES §8–§9; honest placeholders for §10.

Tasks:
- Help Center: reuse `SECTIONS` + `FAQS` content verbatim; native accordion; "Not available yet" sections.
- Profile + Settings (sign out, cooldown/focus toggles); mark billing/plan as not available.
- **Notifications:** wire `expo-notifications` for real local/push reminders — streak nudge, cooldown, holding big-move alerts, "new picks today." Request permission politely.

**Done when:** Help renders all articles + FAQ; settings can sign out; at least one real local notification fires (e.g., streak reminder).

---

## Phase 8 — Native polish & release
**Goal:** Ship-quality native experience.

Tasks:
- Pull-to-refresh, skeleton loaders, haptics on key actions, in-app browser for news.
- Reduced-motion support; reanimated versions of `stagger-fade`/`signal-draw`/`candle-grow`.
- Empty/error states audited on every screen; offline read cache.
- Accessibility: labels on icon buttons, dynamic type, contrast.
- App icons + splash; EAS build config; TestFlight / Play internal track.
- Analytics + crash reporting (Sentry/Expo).

**Done when:** the app passes an internal device test of every flow with a seeded account, builds via EAS, and is installable on TestFlight/Play internal.

---

## Cross-cutting acceptance checks (apply every phase)
- Type-check + build clean.
- Real-device/simulator verification of the actual flow (not just compile).
- Every data surface: loading + empty + error states present.
- No fabricated/placeholder data presented as real (use the trailing-returns + honest-empty patterns from AGENTS §5).
- Design tokens unchanged from the taupe system.

## Known external blockers (not your code)
- **AI features** depend on the MiniMax account having balance (currently insufficient → 502). Build the UI to degrade gracefully; AI will light up once the account is funded.
- **Pick history is shallow** in the current data (scans ~from late-Apr; latest scan is fresh) — use trailing returns (1/5/21) for pick performance, not since-pick (~0).

## Sequencing notes
- Phases 0–2 are the foundation — do them fully before UI phases.
- Phase 3 (Dashboard) is the highest-leverage screen; prioritize it.
- Phases 4–6 can be parallelized across agents if isolated (each owns its tab + its hooks).
- Keep the shared `lib/` as the single source of domain logic — fix bugs there, not per-screen.
