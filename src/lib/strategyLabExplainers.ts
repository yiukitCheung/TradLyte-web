// DOM-free. Chooses which explainer illustration a Lab choice uses.
// Hybrid: headline indicators (RSI, MA-cross, MACD, candles) get bespoke
// combined scenes; everything else reuses an existing mini-visual.
export const EXPLAINER_KINDS = [
  "rsi-entry", "ma-cross", "macd", "candle", "price-cross",
  "bollinger", "stochastic", "atr",
  "bracket", "take-profit", "stop-loss", "trailing", "time",
  "signal-flip", "indicator-exit", "none",
] as const;
export type ExplainerKind = (typeof EXPLAINER_KINDS)[number];

export function explainerKindForSetupTile(key: string): ExplainerKind {
  switch (key) {
    case "rsi": return "rsi-entry";
    case "trend": return "ma-cross";
    case "EMA": return "ma-cross";
    case "SMA": return "price-cross";
    case "MACD": return "macd";
    case "BB": return "bollinger";
    case "STOCH": return "stochastic";
    case "ATR": return "atr";
    default: return "none"; // "none" tile + "custom" have no single scene
  }
}

export function explainerKindForEntryMode(mode: string): ExplainerKind {
  switch (mode) {
    case "candle_pattern": return "candle";
    case "price_level": return "price-cross";
    default: return "none";
  }
}

export function explainerKindForExitMode(mode: string): ExplainerKind {
  switch (mode) {
    case "bracket": return "bracket";
    case "take_profit": return "take-profit";
    case "stop_loss": return "stop-loss";
    case "trailing": return "trailing";
    case "time": return "time";
    case "death_cross": return "signal-flip";
    case "indicator_cross": return "indicator-exit";
    default: return "none";
  }
}
