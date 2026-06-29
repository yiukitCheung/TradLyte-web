# TradLyte Serving API — HTTP guide

FastAPI app packaged as Lambda (`dev-serving-api`), exposed through Amazon API Gateway HTTP API. Most routes are GET; backtest is POST.

## Base URL

`deploy_http_api.sh` prints:

```text
https://{API_ID}.execute-api.{AWS_REGION}.amazonaws.com/{STAGE_NAME}
```

Defaults: region `ca-west-1`, stage `v1`, API name `dev-serving-http-api`. The stage is already in the URL, so call routes without an extra `/v1` prefix (e.g. `.../v1/picks/today`).

## Authentication

- If `SERVING_API_KEY` (or `SERVING_API_KEY_SECRET_ARN`) is set on the Lambda, every protected route requires header `x-api-key: <key>`. Validation happens inside the Lambda (HTTP API does not validate it natively).
- `GET /health` is not behind the API-key dependency.
- For browser apps a static client-side key is visible to users; prefer user auth (JWT/Cognito) or a backend proxy for production.

## CORS

Configured in `deploy_http_api.sh`: methods `GET`, `POST`, `OPTIONS`; headers include `content-type` and `x-api-key`. Set `ALLOWED_ORIGIN` when deploying.

## Response shapes

```json
{ "data": {}, "meta": {} }
```

Errors:

```json
{ "error": { "code": "http_error", "message": "..." } }
```

HTTP status reflects the error (`401`, `404`, `500`, …).

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness: `status`, `service`, `timestamp` |

### Screener

| Method | Path | Description |
|--------|------|-------------|
| GET | `/screener/quotes` | Filtered universe with latest daily OHLCV |

Params: `industry`, `type`, `min_market_cap`, `max_market_cap`, `sort` (`field:asc|desc`; fields `marketcap`/`symbol`/`close`/`volume`, default `marketcap:desc`), `limit` (1–500, default 50), `offset`.

### Picks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/picks/today` | Latest `scan_date` ranked rows from `stock_picks` |
| GET | `/picks/today/metadata` | Same, including the `metadata` JSON column |
| GET | `/picks/detail` | One symbol + scan date, joined with `symbol_metadata` |
| GET | `/picks/{scan_date}/returns` | Per-pick return horizons after `scan_date` |

Key params: `/picks/today` — `limit` (1–200, default 25), `industry`, `min/max_market_cap`. `/picks/detail` — `symbol` (req), `scan_date` (req), `strategy_name`. `/picks/{scan_date}/returns` — `horizons` (comma-separated trading days, default `1,5,21`), `industry`, `min/max_market_cap`.

### Market

| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/quote/{symbol}` | Latest daily bar + metadata |
| GET | `/market/news/{symbol}` | Polygon news feed (`limit` 1–50, `order`, `published_utc_gte/lte`) |
| GET | `/market/ohlcv/{symbol}` | OHLCV history (`interval` `1d`/`1h`/`15m`/`5m`/`1m`, `start_date`, `end_date`, `limit` 1–2000, `sort`) |
| GET | `/market/returns/{symbol}` | Multi-horizon returns (`horizons`, default `1,5,21`) |

### Backtest

| Method | Path | Description |
|--------|------|-------------|
| POST | `/backtest` | Single-symbol strategy backtest over a date range |

`dev-serving-api` validates the request and proxies execution to `dev-serving-backtester`. API Gateway HTTP API integration timeout is 30 s; keep `(end_date - start_date) ≤ BACKTEST_MAX_LOOKBACK_DAYS` (default `1825` ≈ 5 years). The engine is long-only.

**Timeframes** — the source is raw 1d OHLCV resampled on the fly to Fibonacci day-bars: `1d`, `3d`, `5d`, `8d`, `13d`, `21d`, `34d`. There is no intraday and no arbitrary day multiples; any other `timeframe` (top-level or per-component) is rejected with `400`.

#### Composition model

A bar opens a position when `setup_valid && trigger` fire; `exit` closes it:

- **Setup** — regime/trend/pattern filter producing the boolean `setup_valid`. Use `type: "NONE"` to disable.
- **Trigger** — **optional, indicator-free.** Emits `BUY` only when `setup_valid && trigger_condition`; a `BUY` while a position is open is ignored. Allowed types are `CANDLE_PATTERN` and `PRICE_CROSSOVER` (a fixed price level) only — indicator crossovers and expression triggers were removed. **Omit the `trigger` component entirely to enter on the setup edge** — a `BUY` fires on each bar where `setup_valid` flips `false→true`. (Pair a coarse-TF or pattern setup with a skipped trigger for a pure pattern/condition entry.)
- **Exit** — two tiers: position-relative rules (`STOP_LOSS_PCT`, `STOP_LOSS_ANCHOR`, `TAKE_PROFIT_PCT`, `TRAILING_STOP_PCT`, `TIME_BASED`, `RANGE_BRACKET`) applied by `Backtester` against the entry price/peak/OHLC/date; vectorized rules (`INDICATOR_CROSS`, `EXPRESSION`) evaluated on the bar. Exits OR together — first to fire wins. The `exit` component is optional too (position then rides to `end_of_data`).

#### Request body

```json
{
  "strategy_name": "Momentum_Swing",
  "symbol": "AAPL",
  "timeframe": "1d",
  "start_date": "2022-01-01",
  "end_date": "2024-12-31",
  "initial_capital": 10000,
  "components": {
    "setup":   { /* SetupComponentConfig */ },
    "trigger": { /* TriggerComponentConfig */ },
    "exit":    { /* ExitComponentConfig */ }
  }
}
```

`strategy_name`, `symbol`, `start_date`, `end_date`, and a non-empty `components` object are required; `timeframe` defaults to `1d` and `initial_capital` to `10000`. Within `components`, only `setup` is needed — `trigger` and `exit` are optional (skipped trigger → setup-edge entry; no exit → ride to `end_of_data`). Validated by Pydantic (`RequirementsStrategyConfig`); bad input returns `400`.

> **⚠️ Deployment vs spec (curl-verified 2026-06-27).** A few documented features are not live on the current `dev-serving` deployment — treat curl against `/backtest` as ground truth until it catches up:
> - `CANDLE_PATTERN` **setup** → `500 Unknown setup type` (candle patterns work as a *trigger* only).
> - `STOP_LOSS_ANCHOR` **exit** → validates, then `500 Unknown exit type` at run.
> - `RANGE_BRACKET` **exit** → `400` (not in the deployed exit enum).
> - `INDICATOR_CROSSOVER` / `EXPRESSION` **triggers** are described as removed below, but the deployment still accepts and executes them. Treat them as deprecated and prefer the setup-edge pattern.

#### Setup types

| `type` | Required fields |
|---|---|
| `NONE` | none (`setup_valid` always true) |
| `CANDLE_PATTERN` ⚠️ *(not on current deployment — `500 Unknown setup type`)* | `pattern` — `setup_valid` is true on bars where the pattern fires (one-bar event; pair with a skipped trigger for a pure pattern entry). Same pattern names as the trigger table below |
| `INDICATOR_THRESHOLD` | `indicator` (registry name), `params`, `operator` (`>` `<` `>=` `<=` `==` `CROSS_ABOVE` `CROSS_BELOW`), `value` or `indicator2` (column name) for crosses |
| `EXPRESSION` | `expression` (boolean tree) |

#### Trigger types

The trigger is **optional and indicator-free** — only the two types below. To enter on an indicator condition, put it in `setup` (e.g. an `EXPRESSION` with `CROSS_ABOVE`) and **omit the trigger** so entries fire on the setup edge.

| `type` | Required fields | Notes |
|---|---|---|
| `CANDLE_PATTERN` | `pattern` | BUY: `BULLISH_ENGULFING`/`HAMMER`/`MORNING_STAR`/`GREEN_CANDLE`; SELL: `BEARISH_ENGULFING`/`SHOOTING_STAR`/`EVENING_STAR`/`RED_CANDLE`; `DOJI` neutral |
| `PRICE_CROSSOVER` | `direction` + `price_level` (a fixed number) | `ABOVE`→BUY, `BELOW`→SELL. Crossing an indicator is no longer supported here |

*Omitted trigger* → BUY on each bar where `setup_valid` flips `false→true`.

#### Exit types

| Leaf `type` | Fields | Behaviour |
|---|---|---|
| `STOP_LOSS_PCT` | `value` (0–1) | `close ≤ entry_price × (1 − value)` |
| `STOP_LOSS_ANCHOR` ⚠️ *(not on current deployment — validates, then `500 Unknown exit type`)* | `anchor` (`ENTRY_OPEN`/`HIGH`/`LOW`/`CLOSE`), `offset_pct` | `close ≤ anchor × (1 − offset_pct)`; anchor is the entry candle's OHLC |
| `TAKE_PROFIT_PCT` | `value` (≥ 0) | `close ≥ entry_price × (1 + value)` |
| `TRAILING_STOP_PCT` | `value` (0–1) | `close ≤ peak_price × (1 − value)` |
| `TIME_BASED` | `max_holding_days` | Force exit after N days (author as top-level `exit.type`, not inside `conditions[]`) |
| `RANGE_BRACKET` ⚠️ *(not on current deployment — `400`, absent from the exit enum)* | `tp_mult` and/or `sl_mult` | Bracket sized off the entry candle range `R = entry_high − entry_low`: take-profit at `entry + tp_mult × R`, stop at `entry − sl_mult × R`. Either multiplier optional; armed only when `R > 0`. Multiples keep TP above / SL below entry automatically |
| `INDICATOR_CROSS` | `indicator` (column), `direction`, `value` | Cross of a threshold |
| `EXPRESSION` | `expression` | Boolean exit |

Compose multiple stops/targets under `CONDITIONAL_OR_FIXED.conditions[]` (OR logic), or set a single leaf type directly as `exit.type`. `exit_reason` in the response is one of `stop_loss`, `stop_loss_range`, `take_profit`, `take_profit_range`, `trailing_stop`, `time_based`, `stop_loss_anchor`, `signal`, `end_of_data`.

#### Indicator reference

Indicators resolve through `shared.analytics_core.indicators.technicals.INDICATOR_REGISTRY`. In the `EXPRESSION` form reference them **by registry name** (`"EMA"`, `params`); in the flat fields (`INDICATOR_THRESHOLD` `indicator2`, `INDICATOR_CROSS` exit `indicator`) use the resolved **column name** (`"ema_8"`).

| Registry name | Defaults | Output column(s) |
|---|---|---|
| `RSI` | `period=14` | `rsi_{period}` |
| `SMA` | `period=20` | `sma_{period}` |
| `EMA` | `period=20` | `ema_{period}` |
| `ATR` | `period=14` | `atr_{period}` |
| `MACD` | `12/26/9` | `macd_{f}_{s}` / `macd_signal_{f}_{s}_{sig}` / `macd_hist_…` (pick via `output`) |
| `BB` | `period=20, std=2.0` | `bb_{middle\|upper\|lower}_{period}_{std}` (pick via `output`) |
| `STOCH` | `k=14, d=3` | `stoch_{k\|d}_{k}_{d}` (pick via `output`) |

#### Expression DSL

A recursive boolean tree discriminated by `op`:

| Family | Examples |
|---|---|
| Operands | `{"indicator":"RSI","params":{"period":13}}`, `{"indicator":"MACD","output":"signal"}`, `{"price":"close"}`, `{"const":50}` |
| Comparators / pattern | `{"op":"GT\|LT\|GTE\|LTE\|EQ\|NEQ\|CROSS_ABOVE\|CROSS_BELOW","left":…,"right":…}`, `{"op":"PATTERN","pattern":"DOJI"}` |
| Combinators | `{"op":"AND\|OR","conditions":[…]}`, `{"op":"NOT","condition":…}` |

#### Multi-timeframe

Each component has its own `timeframe` (default the top-level `timeframe`). 1d is resampled to each referenced timeframe; a component runs on its own frame and its output column aligns onto the base. State columns (`setup_valid`, indicators) forward-fill from the higher TF to base; event columns (`signal`, `exit_signal`) fire only on the matching date. Typical use: **setup on a higher TF (regime), trigger + exit on the base**.

Constraints (alignment only goes coarse→fine):

- The **base** (top-level `timeframe`) must be the **finest** timeframe used. A component finer than the base is rejected (`400`).
- The **trigger must run on the base** timeframe — it reads the aligned setup filter, so a coarser trigger would silently drop it (`400`).
- Setup and exit may be the base or coarser.

## Examples

### Minimal smoke test

Always-on setup, every green candle enters, single 10% take-profit:

```json
{
  "strategy_name": "smoke_test",
  "symbol": "AAPL", "timeframe": "1d",
  "start_date": "2025-01-01", "end_date": "2025-01-31",
  "initial_capital": 10000,
  "components": {
    "setup":   { "type": "NONE",            "timeframe": "1d" },
    "trigger": { "type": "CANDLE_PATTERN",  "timeframe": "1d", "pattern": "GREEN_CANDLE" },
    "exit":    { "type": "TAKE_PROFIT_PCT", "timeframe": "1d", "value": 0.10 }
  }
}
```

### EMA trend + structural stop (indicator entry via setup, no trigger)

Indicator entries live in `setup` now. Combine the regime and the entry cross in one `EXPRESSION` (`setup_valid` is true on the bar where, inside an EMA(8) > EMA(21) regime, close crosses above EMA(8)) and **omit the trigger** so the entry fires on that setup edge. Exit on whichever fires first — 1% below the entry candle's low, or 10% take-profit:

```json
{
  "strategy_name": "ema_trend_anchor",
  "symbol": "AAPL", "timeframe": "1d",
  "start_date": "2023-01-01", "end_date": "2024-12-31",
  "initial_capital": 10000,
  "components": {
    "setup": {
      "type": "EXPRESSION", "timeframe": "1d",
      "expression": { "op": "AND", "conditions": [
        { "op": "GT",
          "left":  { "indicator": "EMA", "params": { "period": 8  } },
          "right": { "indicator": "EMA", "params": { "period": 21 } } },
        { "op": "CROSS_ABOVE",
          "left":  { "price": "close" },
          "right": { "indicator": "EMA", "params": { "period": 8 } } }
      ] }
    },
    "exit": {
      "type": "CONDITIONAL_OR_FIXED", "timeframe": "1d",
      "conditions": [
        { "type": "STOP_LOSS_ANCHOR", "anchor": "ENTRY_LOW", "offset_pct": 0.01 },
        { "type": "TAKE_PROFIT_PCT",  "value": 0.10 }
      ]
    }
  }
}
```

### Multi-timeframe regime + range bracket

Weekly-ish trend filter on `5d` (RSI(14) > 50), enter on a 1d hammer, exit on a bracket sized off the entry candle range — take-profit at 2× the range above entry, stop at 1.5× the range below. Setup is coarser; trigger and exit run on the `1d` base:

```json
{
  "strategy_name": "mtf_range_bracket",
  "symbol": "AAPL", "timeframe": "1d",
  "start_date": "2023-01-01", "end_date": "2024-12-31",
  "initial_capital": 10000,
  "components": {
    "setup": {
      "type": "INDICATOR_THRESHOLD", "timeframe": "5d",
      "indicator": "RSI", "params": { "period": 14 }, "operator": ">", "value": 50
    },
    "trigger": { "type": "CANDLE_PATTERN", "timeframe": "1d", "pattern": "HAMMER" },
    "exit":    { "type": "RANGE_BRACKET",  "timeframe": "1d", "tp_mult": 2.0, "sl_mult": 1.5 }
  }
}
```

### Response shape

```json
{
  "data": {
    "total_return": 9509.23, "total_return_pct": 0.9509,
    "total_trades": 10, "winning_trades": 8, "losing_trades": 2,
    "win_rate": 0.80, "avg_win": 16.97, "avg_loss": -5.99,
    "profit_factor": 11.33, "max_drawdown": 1338.31, "max_drawdown_pct": 0.1338,
    "sharpe_ratio": 2.54, "equity_curve": [10000.0, "..."],
    "initial_capital": 10000, "final_capital": 19509.23,
    "trades": [
      { "entry_date": "2023-07-12", "entry_price": 187.68,
        "entry_open": 187.59, "entry_high": 189.58, "entry_low": 186.39, "entry_close": 187.68,
        "exit_date": "2023-08-04", "exit_price": 179.98,
        "pnl": -7.70, "pnl_pct": -0.041, "holding_days": 23, "exit_reason": "stop_loss_anchor" }
    ]
  },
  "meta": { "symbol": "AAPL", "strategy_name": "ema_trend_anchor", "timeframe": "1d",
            "start_date": "2023-01-01", "end_date": "2024-12-31", "source": "dev-serving-backtester" }
}
```

Each trade carries the entry candle's OHLC so consumers can recompute structural-stop levels without re-pulling raw bars.

## curl

```bash
BASE="https://abc123xyz.execute-api.ca-west-1.amazonaws.com/v1"
KEY="your-serving-api-key"

curl -sS -H "x-api-key: $KEY" "$BASE/picks/today?limit=10"
curl -sS -H "x-api-key: $KEY" "$BASE/market/ohlcv/MSFT?interval=1d&limit=50"
curl -sS -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" "$BASE/backtest" \
  -d '{"strategy_name":"smoke_test","symbol":"AAPL","timeframe":"1d","start_date":"2025-01-01","end_date":"2025-01-31","initial_capital":10000,"components":{"setup":{"type":"NONE","timeframe":"1d"},"trigger":{"type":"CANDLE_PATTERN","timeframe":"1d","pattern":"GREEN_CANDLE"},"exit":{"type":"TAKE_PROFIT_PCT","timeframe":"1d","value":0.1}}}'
```
