/**
 * Indicator catalog + helpers for the Custom backtest configurator.
 *
 * Centralises the indicator names + parameters understood by the serving
 * `/backtest` payload. Two output shapes are produced from the same
 * `IndicatorOperand` so the UI can stay shape-agnostic:
 *
 * 1. **Expression operand** (`{"indicator": "EMA", "params": {"period": 8}}` or
 *    `{"indicator": "MACD", "output": "signal"}`) — used inside the recursive
 *    `EXPRESSION` DSL (setup / exit / advanced trigger).
 * 2. **Compact name** (`"ema_8"`, `"sma_50"`) — used by the legacy
 *    `INDICATOR_CROSSOVER` trigger fields `indicator1` / `indicator2` and the
 *    `INDICATOR_CROSS` exit `indicator` field.
 *
 * The catalog is intentionally narrow so the picker stays scannable. Add new
 * entries here when the backtester announces support for them.
 */

export type IndicatorParamLocation = "params" | "top";

export interface IndicatorParamSpec {
  key: string;
  label: string;
  location: IndicatorParamLocation;
  type: "number" | "enum";
  default: number | string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface IndicatorDefinition {
  /** Backend identifier as it travels in `{"indicator": "..."}`. */
  id: string;
  /** UI label (matches id today, but room to localise). */
  label: string;
  fields: IndicatorParamSpec[];
  /** True when the indicator supports a compact `name_period` slug. */
  supportsCompactName?: boolean;
}

/** Special pseudo-indicator: bare price field (`{"price": "close"}`). */
export const PRICE_OPERAND_ID = "PRICE";

/** Catalog (extend as backend grows; keep deterministic ordering). */
export const INDICATORS: IndicatorDefinition[] = [
  {
    id: "EMA",
    label: "EMA",
    supportsCompactName: true,
    fields: [
      { key: "period", label: "period", location: "params", type: "number", default: 20, min: 2, max: 1000, step: 1 },
    ],
  },
  {
    id: "SMA",
    label: "SMA",
    supportsCompactName: true,
    fields: [
      { key: "period", label: "period", location: "params", type: "number", default: 50, min: 2, max: 1000, step: 1 },
    ],
  },
  {
    id: "RSI",
    label: "RSI",
    fields: [
      { key: "period", label: "period", location: "params", type: "number", default: 14, min: 2, max: 200, step: 1 },
    ],
  },
  {
    id: "MACD",
    label: "MACD",
    fields: [
      {
        key: "output",
        label: "output",
        location: "top",
        type: "enum",
        default: "signal",
        options: [
          { value: "macd", label: "macd" },
          { value: "signal", label: "signal" },
          { value: "histogram", label: "histogram" },
        ],
      },
    ],
  },
  {
    id: PRICE_OPERAND_ID,
    label: "Price",
    fields: [
      {
        key: "field",
        label: "field",
        location: "top",
        type: "enum",
        default: "close",
        options: [
          { value: "open", label: "open" },
          { value: "high", label: "high" },
          { value: "low", label: "low" },
          { value: "close", label: "close" },
        ],
      },
    ],
  },
];

export type IndicatorParamValue = number | string;

export interface IndicatorOperand {
  indicator: string;
  /** All resolved params keyed by `IndicatorParamSpec.key`. */
  values: Record<string, IndicatorParamValue>;
}

export function getIndicatorDef(id: string): IndicatorDefinition | undefined {
  return INDICATORS.find((d) => d.id === id);
}

/** Builds an operand pre-filled with each field's `default` value. */
export function defaultOperandFor(indicatorId: string, overrides?: Record<string, IndicatorParamValue>): IndicatorOperand {
  const def = getIndicatorDef(indicatorId);
  const values: Record<string, IndicatorParamValue> = {};
  if (def) {
    for (const f of def.fields) values[f.key] = f.default;
  }
  if (overrides) Object.assign(values, overrides);
  return { indicator: indicatorId, values };
}

/** Serialise to the EXPRESSION DSL operand shape. */
export function operandToExpression(operand: IndicatorOperand): Record<string, unknown> {
  const def = getIndicatorDef(operand.indicator);
  if (!def) return { indicator: operand.indicator };

  if (def.id === PRICE_OPERAND_ID) {
    const field = String(operand.values["field"] ?? "close");
    return { price: field };
  }

  const out: Record<string, unknown> = { indicator: def.id };
  const params: Record<string, IndicatorParamValue> = {};
  for (const f of def.fields) {
    const v = operand.values[f.key];
    if (v === undefined) continue;
    if (f.location === "params") params[f.key] = v;
    else out[f.key] = v;
  }
  if (Object.keys(params).length) out.params = params;
  return out;
}

/**
 * Compact name for legacy slots — only valid for indicators flagged with
 * `supportsCompactName` AND a `period` param. Returns `undefined` otherwise.
 */
export function operandToCompactName(operand: IndicatorOperand): string | undefined {
  const def = getIndicatorDef(operand.indicator);
  if (!def?.supportsCompactName) return undefined;
  const period = operand.values["period"];
  if (period == null || period === "") return undefined;
  return `${def.id.toLowerCase()}_${period}`;
}

/** Parse a `name_period` slug back into a structured operand (best-effort). */
export function compactNameToOperand(slug: string): IndicatorOperand | undefined {
  const m = /^([a-zA-Z]+)_(\d+(?:\.\d+)?)$/.exec(slug.trim());
  if (!m) return undefined;
  const id = m[1].toUpperCase();
  const def = getIndicatorDef(id);
  if (!def?.supportsCompactName) return undefined;
  return defaultOperandFor(id, { period: Number(m[2]) });
}

/** Reverse of {@link operandToExpression}; returns undefined if the JSON is not a recognised operand. */
export function expressionToOperand(node: unknown): IndicatorOperand | undefined {
  if (!node || typeof node !== "object" || Array.isArray(node)) return undefined;
  const obj = node as Record<string, unknown>;

  if (typeof obj.price === "string") {
    return defaultOperandFor(PRICE_OPERAND_ID, { field: obj.price });
  }

  if (typeof obj.indicator === "string") {
    const def = getIndicatorDef(obj.indicator);
    if (!def) return undefined;
    const overrides: Record<string, IndicatorParamValue> = {};
    const params = obj.params && typeof obj.params === "object" ? (obj.params as Record<string, unknown>) : undefined;
    for (const f of def.fields) {
      if (f.location === "params") {
        const v = params?.[f.key];
        if (typeof v === "number" || typeof v === "string") overrides[f.key] = v;
      } else {
        const v = obj[f.key];
        if (typeof v === "number" || typeof v === "string") overrides[f.key] = v;
      }
    }
    return defaultOperandFor(def.id, overrides);
  }

  return undefined;
}

/** Indicators usable as left-hand setup operands or trigger crossover legs. */
export const SETUP_LEFT_INDICATORS: string[] = ["EMA", "SMA", "RSI", "MACD", PRICE_OPERAND_ID];
export const TRIGGER_CROSSOVER_INDICATORS: string[] = ["EMA", "SMA"];

/** All exit-time `INDICATOR_CROSS` candidates — same flat-string slot as triggers. */
export const EXIT_INDICATOR_CROSS_INDICATORS: string[] = ["EMA", "SMA", "RSI"];
