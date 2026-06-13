export interface BacktestTrade {
  entry_date?: string;
  entry_price?: number;
  exit_date?: string;
  exit_price?: number;
  pnl?: number;
  pnl_pct?: number;
  holding_days?: number;
  exit_reason?: string;
}

export interface BacktestResult {
  total_return_pct?: number;
  sharpe_ratio?: number;
  max_drawdown_pct?: number;
  equity_curve?: number[];
  equity_curve_dates?: string[];
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
  win_rate?: number;
  final_capital?: number;
  initial_capital?: number;
  trades?: BacktestTrade[];
}

function asNum(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function looksLikeMetrics(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    asNum(r.total_return_pct) !== undefined ||
    asNum(r.final_capital) !== undefined ||
    asNum(r.total_trades) !== undefined
  );
}

/** API returns fractional returns (0.21 = 21%) unless |v| > 1 (already percent). */
function toFractionalPct(value: unknown): number | undefined {
  const n = asNum(value);
  if (n === undefined) return undefined;
  return Math.abs(n) <= 1 ? n : n / 100;
}

function deriveReturnPct(o: Record<string, unknown>): number | undefined {
  const direct = toFractionalPct(o.total_return_pct);
  if (direct !== undefined) return direct;
  const initial = asNum(o.initial_capital);
  const final = asNum(o.final_capital);
  if (initial !== undefined && final !== undefined && initial > 0) {
    return (final - initial) / initial;
  }
  const totalReturn = asNum(o.total_return);
  if (totalReturn !== undefined && initial !== undefined && initial > 0) {
    return totalReturn / initial;
  }
  return undefined;
}

function deriveMaxDrawdownPct(o: Record<string, unknown>): number | undefined {
  const direct = toFractionalPct(o.max_drawdown_pct);
  if (direct !== undefined) return Math.abs(direct);
  const initial = asNum(o.initial_capital);
  const maxDd = asNum(o.max_drawdown);
  if (maxDd !== undefined && initial !== undefined && initial > 0) {
    return Math.abs(maxDd / initial);
  }
  return undefined;
}

function mapMetrics(o: Record<string, unknown>): BacktestResult {
  const curve = o.equity_curve;
  const curveDatesRaw = o.equity_curve_dates;
  const tradesRaw = o.trades;
  return {
    total_return_pct: deriveReturnPct(o),
    sharpe_ratio: asNum(o.sharpe_ratio),
    max_drawdown_pct: deriveMaxDrawdownPct(o),
    equity_curve: Array.isArray(curve) ? (curve as number[]) : undefined,
    equity_curve_dates: Array.isArray(curveDatesRaw)
      ? curveDatesRaw.filter((x): x is string => typeof x === "string")
      : undefined,
    total_trades: asNum(o.total_trades),
    winning_trades: asNum(o.winning_trades),
    losing_trades: asNum(o.losing_trades),
    win_rate: asNum(o.win_rate),
    final_capital: asNum(o.final_capital),
    initial_capital: asNum(o.initial_capital),
    trades: Array.isArray(tradesRaw)
      ? tradesRaw.map((t) => normalizeTrade(t)).filter((t): t is BacktestTrade => t != null)
      : undefined,
  };
}

function normalizeTrade(raw: unknown): BacktestTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  return {
    entry_date: typeof t.entry_date === "string" ? t.entry_date : undefined,
    exit_date: typeof t.exit_date === "string" ? t.exit_date : undefined,
    entry_price: asNum(t.entry_price),
    exit_price: asNum(t.exit_price),
    pnl: asNum(t.pnl),
    pnl_pct: asNum(t.pnl_pct),
    holding_days: asNum(t.holding_days),
    exit_reason: typeof t.exit_reason === "string" ? t.exit_reason : undefined,
  };
}

export function normalizeBacktestResponse(rawData: unknown, preferredKey?: string): BacktestResult | null {
  if (rawData == null || typeof rawData !== "object") return null;
  const root = rawData as Record<string, unknown>;

  if (preferredKey && preferredKey in root && looksLikeMetrics(root[preferredKey])) {
    return mapMetrics(root[preferredKey] as Record<string, unknown>);
  }
  for (const k of Object.keys(root)) {
    if (preferredKey && k === preferredKey) continue;
    if (looksLikeMetrics(root[k])) return mapMetrics(root[k] as Record<string, unknown>);
  }
  if (looksLikeMetrics(root)) return mapMetrics(root);
  return null;
}

/** Signed return for display (+12.3% / −8.1%). Input is fractional (0.123 = 12.3%). */
export function formatReturnPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** Drawdown magnitude always shown negative (largest peak-to-trough). Input is fractional. */
export function formatDrawdownPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = Math.abs(value) * 100;
  return `−${pct.toFixed(1)}%`;
}

export function formatWinRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value >= 0 && value <= 1 ? value * 100 : value;
  return `${pct.toFixed(0)}%`;
}

/** @deprecated use formatReturnPct or formatDrawdownPct */
export function formatPct(value: number | null | undefined): string {
  return formatReturnPct(value);
}

export interface TradeLogRow {
  entryDate: string;
  exitDate: string;
  entryPrice: string;
  exitPrice: string;
  pnl: string;
  pnlPct: string;
  up: boolean;
  exitReason: string;
}

export function tradesToLogRows(trades: BacktestTrade[] | undefined, limit?: number): TradeLogRow[] {
  const slice = limit ? (trades ?? []).slice(0, limit) : trades ?? [];
  return slice.map((t) => {
    const pnl = t.pnl ?? 0;
    const pnlPct = t.pnl_pct ?? 0;
    const pctDisplay =
      Math.abs(pnlPct) <= 1 ? pnlPct * 100 : pnlPct;
    return {
      entryDate: t.entry_date ?? "—",
      exitDate: t.exit_date ?? "—",
      entryPrice: t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : "—",
      exitPrice: t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : "—",
      pnl: `${pnl >= 0 ? "+" : "−"}$${Math.abs(pnl).toFixed(2)}`,
      pnlPct: `${pctDisplay >= 0 ? "+" : ""}${pctDisplay.toFixed(1)}%`,
      up: pnl >= 0,
      exitReason: t.exit_reason?.replace(/_/g, " ") ?? "—",
    };
  });
}

export function buildEquityChartData(
  curve: number[],
  opts?: { dates?: string[]; startDate?: string; endDate?: string },
): { label: string; strategy: number }[] {
  if (!curve.length) return [];
  const n = curve.length;
  let labels: string[] = [];

  if (opts?.dates?.length === n) {
    labels = opts.dates.map((d) => d.slice(0, 10));
  } else if (opts?.startDate && opts?.endDate) {
    const start = Date.parse(`${opts.startDate}T12:00:00Z`);
    const end = Date.parse(`${opts.endDate}T12:00:00Z`);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      labels = curve.map((_, i) => {
        const ms = start + ((end - start) * i) / Math.max(n - 1, 1);
        return new Date(ms).toISOString().slice(0, 10);
      });
    }
  }

  return curve.map((value, i) => ({
    label: labels[i] ?? String(i + 1),
    strategy: value,
  }));
}
