/**
 * Plain-language glossary for the Strategy Lab. DOM-free data only so it can be
 * shared with mobile and read by both the inline "what's this?" explainers and
 * the living strategy sentence.
 *
 * `lessonId` (when present) deep-links the interactive lesson drawer:
 *   - "ema-sensitivity" | "rsi-saturation" | "macd-momentum" | "bollinger-squeeze"
 *     resolve through the education LESSONS registry.
 *   - "candle-anatomy" opens the candle primer.
 * `visual` names a mini illustration the explainer can render (see StrategyLabVisuals).
 */
export interface GlossaryEntry {
  /** Stable key referenced by sentence segments + Info affordances. */
  key: string;
  /** Short human label (sentence case). */
  term: string;
  /** One or two plain sentences — no jargon, no apology. */
  plain: string;
  lessonId?: string;
  visual?: string;
}

export const STRATEGY_GLOSSARY: Record<string, GlossaryEntry> = {
  // --- Indicators ---------------------------------------------------------
  RSI: {
    key: "RSI",
    term: "RSI",
    plain:
      "Measures how fast a price has risen or fallen, on a 0–100 scale. Above 70 is often called overbought, below 30 oversold.",
    lessonId: "rsi-saturation",
    visual: "rsi",
  },
  EMA: {
    key: "EMA",
    term: "EMA",
    plain:
      "An average of recent prices that leans on the latest days, so it turns faster than a plain average. Used to read the trend.",
    lessonId: "ema-sensitivity",
    visual: "crossover",
  },
  SMA: {
    key: "SMA",
    term: "SMA",
    plain: "A simple average of the last N closing prices — a smooth line that shows the underlying trend.",
    lessonId: "ema-sensitivity",
    visual: "crossover",
  },
  ATR: {
    key: "ATR",
    term: "ATR",
    plain: "Average True Range — how much a stock typically moves in a day. A volatility gauge, not a direction call.",
  },
  MACD: {
    key: "MACD",
    term: "MACD",
    plain:
      "Compares two moving averages to show momentum. When its line crosses above the signal line, momentum is turning up.",
    lessonId: "macd-momentum",
  },
  BB: {
    key: "BB",
    term: "Bollinger Bands",
    plain:
      "A band drawn above and below the average that widens with volatility. Price near the edges can signal a stretch.",
    lessonId: "bollinger-squeeze",
  },
  STOCH: {
    key: "STOCH",
    term: "Stochastic",
    plain: "Shows where today's close sits within its recent high–low range, on a 0–100 scale. Another momentum read.",
  },

  // --- Building blocks ----------------------------------------------------
  timeframe: {
    key: "timeframe",
    term: "Timeframe",
    plain:
      "How long each candle covers. Daily uses one bar per day; a 5-day bar groups a week. Bigger bars mean fewer, calmer signals.",
  },
  multiTimeframe: {
    key: "multiTimeframe",
    term: "Multi-timeframe",
    plain:
      "Check the bigger trend on a slower chart before acting on the fast one — for example, only buy on the daily when the weekly trend agrees.",
  },
  setup: {
    key: "setup",
    term: "Setup",
    plain: "The condition that has to be true before you'll even consider buying — your filter for the right backdrop.",
  },
  trigger: {
    key: "trigger",
    term: "Entry trigger",
    plain: "The exact green light that fires the buy once the setup is in place.",
  },
  setupEdge: {
    key: "setupEdge",
    term: "Setup-edge entry",
    plain: "Buy the moment the setup first becomes true — no extra confirmation needed. Best for crossover strategies.",
  },
  candlePattern: {
    key: "candlePattern",
    term: "Candle pattern",
    plain: "A recognisable shape in one or two candles that hints the next move — like a hammer or an engulfing bar.",
    lessonId: "candle-anatomy",
    visual: "candle",
  },
  priceCrossover: {
    key: "priceCrossover",
    term: "Price level",
    plain: "Enter when price crosses a fixed dollar level you set — a simple breakout or breakdown line.",
    visual: "priceCross",
  },

  // --- Exits --------------------------------------------------------------
  stopLoss: {
    key: "stopLoss",
    term: "Stop loss",
    plain: "A line in the sand: if price falls this far from your entry, you're out. Caps the loss on a trade.",
    visual: "bracket",
  },
  takeProfit: {
    key: "takeProfit",
    term: "Take profit",
    plain: "A target: when the gain reaches this much, you sell and lock it in.",
    visual: "bracket",
  },
  trailingStop: {
    key: "trailingStop",
    term: "Trailing stop",
    plain: "A stop that ratchets up as price rises, so it protects gains while letting a winner keep running.",
  },
  indicatorExit: {
    key: "indicatorExit",
    term: "Indicator exit",
    plain: "Close the trade when an indicator crosses a level — for example, sell when RSI falls back below 50.",
    visual: "rsi",
  },
  timeExit: {
    key: "timeExit",
    term: "Time exit",
    plain: "Close the trade after a set number of days, win or lose — useful when a move hasn't played out.",
  },
  signalFlip: {
    key: "signalFlip",
    term: "Signal flip",
    plain: "Exit when the trend signal reverses — for example, the fast average crossing back below the slow one.",
  },

  // --- Result metrics -----------------------------------------------------
  totalReturn: {
    key: "totalReturn",
    term: "Total return",
    plain: "How much the account grew or shrank over the whole test, as a percentage of what you started with.",
  },
  sharpe: {
    key: "sharpe",
    term: "Sharpe ratio",
    plain:
      "Return earned per unit of risk taken. Higher is steadier; above 1 is decent, above 2 is strong. Below 0 means the bumps weren't worth it.",
  },
  maxDrawdown: {
    key: "maxDrawdown",
    term: "Max drawdown",
    plain: "The deepest drop from a peak to a trough along the way — the worst pain you'd have sat through.",
  },
  winRate: {
    key: "winRate",
    term: "Win rate",
    plain: "The share of trades that ended in profit. High isn't everything — a few big winners can beat many small ones.",
  },
  profitFactor: {
    key: "profitFactor",
    term: "Profit factor",
    plain: "Total gains divided by total losses. Above 1 means the wins outweighed the losses overall.",
  },
};

export function glossary(key: string): GlossaryEntry | undefined {
  return STRATEGY_GLOSSARY[key];
}
