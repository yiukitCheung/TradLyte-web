import { marketGatewayFetch } from "@/lib/marketGateway";

export type TimePeriod = "1D" | "6M" | "YTD" | "1Y" | "5Y";
type OhlcvInterval = "1d" | "1h" | "15m" | "5m" | "1m";

export interface MarketQuoteItem {
  symbol: string;
  name: string | null;
  industry: string | null;
  market_cap: number | null;
  type: string | null;
  primary_exchange: string | null;
  as_of_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface OhlcvItem {
  symbol: string;
  interval: string;
  timestamp: string;
  trading_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface DashboardIndex {
  name: string;
  symbol: string;
  value: string;
  change: string;
  up: boolean;
}

// Pick "vintage": how long ago the cohort was picked. The list swaps to the scan
// from ~N days before the latest scan, and each row's return is its realized
// since-pick return_to_date (pick date → today). "latest" = today's fresh picks.
export type PickReturnHorizon = "latest" | "1w" | "1m";
export const PICK_VINTAGE_OFFSET_DAYS: Record<Exclude<PickReturnHorizon, "latest">, number> = {
  "1w": 7,
  "1m": 30,
};

function addCalendarDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export interface TopPickRow {
  symbol: string;
  name: string;
  sector: string;
  close: number | null;
  pickPrice: number | null;
  returnPct: number | null;
  rank: number;
  up: boolean;
  scanDate: string | null;
}

export interface DashboardPicksResult {
  scanDate: string | null;
  picks: TopPickRow[];
  industries: string[];
  totalCount: number;
}

function isVegasStrategy(name: string | null | undefined): boolean {
  return (name || "").toLowerCase().includes("vegas_channel");
}

function formatIndustryLabel(raw: string): string {
  if (!raw || raw === "—") return raw;
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatScanDateShort(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function pickReturnHorizonLabel(_horizon: PickReturnHorizon, scanDate: string | null): string {
  // returnPct is the realized return since the pick date (return_to_date).
  const when = formatScanDateShort(scanDate);
  return when ? `since pick · ${when}` : "since pick";
}

interface PickReturnItem {
  scan_date?: string;
  rank?: number | null;
  symbol: string;
  strategy_name?: string | null;
  pick_price?: string | number | null;
  close_now?: string | number | null;
  return_to_date?: number | null;
  returns?: Record<string, number | null>;
}

/** Vegas-strategy pick rows for one scan date (empty if the scan didn't run that day). */
async function fetchVegasReturns(
  scanDate: string,
  industry: string | null,
  signal?: AbortSignal,
): Promise<PickReturnItem[]> {
  const params: Record<string, string> = { horizons: "1,5,21" };
  if (industry) params.industry = industry;
  const res = await marketGatewayFetch(`/picks/${scanDate}/returns`, { searchParams: params, signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: PickReturnItem[] };
  return (json.data ?? []).filter((row) => isVegasStrategy(row.strategy_name));
}

async function fetchSymbolMeta(
  symbols: string[],
  signal?: AbortSignal,
): Promise<Map<string, { name: string; industry: string }>> {
  const map = new Map<string, { name: string; industry: string }>();
  const batchSize = 10;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const res = await marketGatewayFetch(`/market/quote/${symbol}`, { signal });
          if (!res.ok) return;
          const json = (await res.json()) as { data?: { name?: string | null; industry?: string | null } };
          map.set(symbol, {
            name: json.data?.name?.trim() || symbol,
            industry: json.data?.industry?.trim() || "—",
          });
        } catch {
          /* ignore */
        }
      }),
    );
  }
  return map;
}

export const DASHBOARD_INDEX_SPECS: Array<{ name: string; symbol: string; isCurrency?: boolean }> = [
  { name: "S&P 500", symbol: "SPY" },
  { name: "NASDAQ", symbol: "QQQ" },
  { name: "Dow Jones", symbol: "DJIA" },
  { name: "Gold", symbol: "GLD", isCurrency: true },
  { name: "Silver", symbol: "SLV", isCurrency: true },
  { name: "Crude Oil", symbol: "USO", isCurrency: true },
  // US Treasury ETFs (price proxies for short / mid / long yields).
  { name: "US 1-3Y", symbol: "SHY", isCurrency: true },
  { name: "US 7-10Y", symbol: "IEF", isCurrency: true },
  { name: "US 20Y+", symbol: "TLT", isCurrency: true },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const toSafeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const formatCurrency = (value: number | null, digits = 2) => {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `$${value.toFixed(digits)}`;
};

export const formatMarketCap = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "N/A";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
};

export const formatIndexValue = (value: number | null, isCurrency?: boolean) => {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return isCurrency ? `$${value.toFixed(2)}` : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const formatIndexChange = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
};

export const formatPickReturn = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
};

export const mapPeriodToOhlcvParams = (period: TimePeriod) => {
  const endDate = new Date();
  let startDate = new Date(endDate);
  let interval: OhlcvInterval = "1d";
  let limit = 400;

  switch (period) {
    case "1D":
      interval = "1h";
      startDate.setDate(endDate.getDate() - 2);
      limit = 72;
      break;
    case "6M":
      startDate.setDate(endDate.getDate() - 180);
      limit = 220;
      break;
    case "YTD":
      startDate = new Date(endDate.getFullYear(), 0, 1);
      limit = 300;
      break;
    case "1Y":
      startDate.setDate(endDate.getDate() - 365);
      limit = 420;
      break;
    case "5Y":
      startDate.setDate(endDate.getDate() - 365 * 5);
      limit = 2000;
      break;
  }

  return {
    interval,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    limit,
  };
};

function normalizeQuote(raw: MarketQuoteItem): MarketQuoteItem {
  return {
    ...raw,
    market_cap: toSafeNumber(raw.market_cap),
    open: toSafeNumber(raw.open),
    high: toSafeNumber(raw.high),
    low: toSafeNumber(raw.low),
    close: toSafeNumber(raw.close),
    volume: toSafeNumber(raw.volume),
  };
}

export async function fetchMarketQuote(symbol: string, signal?: AbortSignal): Promise<MarketQuoteItem | null> {
  const res = await marketGatewayFetch(`/market/quote/${symbol.toUpperCase()}`, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[fetchMarketQuote]", symbol, res.status, body.slice(0, 200));
    return null;
  }
  const json = (await res.json()) as { data?: MarketQuoteItem };
  return json.data ? normalizeQuote(json.data) : null;
}

export async function fetchOhlcvSeries(
  symbol: string,
  period: TimePeriod,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  const params = mapPeriodToOhlcvParams(period);
  const qs = new URLSearchParams({
    interval: params.interval,
    start_date: params.startDate,
    end_date: params.endDate,
    limit: String(params.limit),
    sort: "asc",
  });
  const res = await marketGatewayFetch(`/market/ohlcv/${symbol.toUpperCase()}`, { searchParams: qs, signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: OhlcvItem[] };
  return (json.data ?? [])
    .map((p) => ({ ...p, close: toSafeNumber(p.close) }))
    .filter((p) => p.close !== null)
    .map((p) => ({
      date: p.timestamp || p.trading_date,
      price: p.close as number,
    }));
}

export async function fetchDashboardIndices(signal?: AbortSignal): Promise<DashboardIndex[]> {
  return Promise.all(
    DASHBOARD_INDEX_SPECS.map(async (spec) => {
      try {
        const [quoteRes, returnsRes] = await Promise.all([
          marketGatewayFetch(`/market/quote/${spec.symbol}`, { signal }),
          marketGatewayFetch(`/market/returns/${spec.symbol}`, {
            searchParams: { horizons: "1" },
            signal,
          }),
        ]);
        if (!quoteRes.ok || !returnsRes.ok) {
          return { name: spec.name, symbol: spec.symbol, value: "N/A", change: "N/A", up: true };
        }
        const quoteJson = (await quoteRes.json()) as { data?: { close?: number | null } };
        const returnsJson = (await returnsRes.json()) as { data?: { returns?: Record<string, number> } };
        const close = toSafeNumber(quoteJson.data?.close);
        const change1d = toSafeNumber(returnsJson.data?.returns?.["1d"] ?? returnsJson.data?.returns?.["1"]);
        return {
          name: spec.name,
          symbol: spec.symbol,
          value: formatIndexValue(close, spec.isCurrency),
          change: formatIndexChange(change1d),
          up: change1d === null || change1d >= 0,
        };
      } catch {
        return { name: spec.name, symbol: spec.symbol, value: "N/A", change: "N/A", up: true };
      }
    }),
  );
}

export async function fetchDashboardPicks(
  options: {
    limit?: number;
    industry?: string | null;
    horizon?: PickReturnHorizon;
    signal?: AbortSignal;
  } = {},
): Promise<DashboardPicksResult> {
  const { limit = 10, industry = null, horizon = "latest", signal } = options;
  const searchParams: Record<string, string> = { limit: "200" };
  if (industry) searchParams.industry = industry;

  const metaRes = await marketGatewayFetch("/picks/today/metadata", { searchParams, signal });
  if (!metaRes.ok) return { scanDate: null, picks: [], industries: [], totalCount: 0 };

  const metaJson = (await metaRes.json()) as {
    data?: Array<{ scan_date?: string; symbol: string; strategy_name?: string | null; rank?: number | null }>;
    meta?: { scan_date?: string };
  };
  const scanDate = metaJson.meta?.scan_date ?? metaJson.data?.[0]?.scan_date ?? null;
  const vegasSymbols = [
    ...new Set(
      (metaJson.data ?? [])
        .filter((row) => isVegasStrategy(row.strategy_name))
        .map((row) => row.symbol),
    ),
  ];

  if (!scanDate) return { scanDate: null, picks: [], industries: [], totalCount: 0 };

  // Resolve which scan cohort to show. "latest" = today's picks (since-pick return ~0
  // because they're fresh). A vintage ages back N days from the latest scan and probes
  // earlier days until it lands on a scan that actually ran, so its picks have a
  // realized return_to_date (pick date → today). Scans aren't daily, hence the probe.
  let cohortDate = scanDate;
  let vegasRows: PickReturnItem[];
  if (horizon === "latest") {
    vegasRows = await fetchVegasReturns(scanDate, industry, signal);
  } else {
    let probe = addCalendarDays(scanDate, -PICK_VINTAGE_OFFSET_DAYS[horizon]);
    let found: PickReturnItem[] = [];
    for (let i = 0; i < 8; i++) {
      const rows = await fetchVegasReturns(probe, industry, signal);
      if (rows.length > 0) {
        found = rows;
        cohortDate = probe;
        break;
      }
      probe = addCalendarDays(probe, -1);
    }
    vegasRows = found;
  }

  if (vegasRows.length === 0) return { scanDate: cohortDate, picks: [], industries: [], totalCount: 0 };

  const vegasReturns = vegasRows.sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );

  const displayRows = vegasReturns.slice(0, limit);
  const metaSymbols = vegasSymbols.slice(0, 80);
  const metaMap = await fetchSymbolMeta([...new Set([...displayRows.map((r) => r.symbol), ...metaSymbols])], signal);

  const industries = [
    ...new Set(
      [...metaMap.values()]
        .map((m) => m.industry)
        .filter((ind) => ind && ind !== "—"),
    ),
  ].sort((a, b) => formatIndustryLabel(a).localeCompare(formatIndustryLabel(b)));

  const picks: TopPickRow[] = displayRows.map((row, idx) => {
    const meta = metaMap.get(row.symbol);
    const close = toSafeNumber(row.close_now);
    const pickPrice = toSafeNumber(row.pick_price);
    // Realized return since the pick. Prefer the API's return_to_date; fall back to
    // computing it from pick price → current close so a missing field never reads as 0.
    let returnPct = toSafeNumber(row.return_to_date);
    if (returnPct === null && pickPrice && close !== null) {
      returnPct = (close - pickPrice) / pickPrice;
    }
    return {
      symbol: row.symbol,
      name: meta?.name ?? row.symbol,
      sector: formatIndustryLabel(meta?.industry ?? "—"),
      close,
      pickPrice,
      returnPct,
      rank: row.rank ?? idx + 1,
      up: returnPct === null || returnPct >= 0,
      scanDate: row.scan_date ?? cohortDate,
    };
  });

  return { scanDate: cohortDate, picks, industries, totalCount: vegasReturns.length };
}

/** @deprecated Use fetchDashboardPicks */
export async function fetchTodayPicks(limit = 10, signal?: AbortSignal): Promise<TopPickRow[]> {
  const result = await fetchDashboardPicks({ limit, signal });
  return result.picks;
}

export interface MarketNewsItem {
  title: string;
  source: string;
  time: string;
  /** Raw ISO publish timestamp (for sorting by recency); empty when unknown. */
  publishedAt: string;
  url: string;
}

function formatNewsTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diffM = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffM < 1) return "just now";
    if (diffM < 60) return `${diffM}m ago`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 48) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export async function fetchMarketNews(symbol: string, signal?: AbortSignal): Promise<MarketNewsItem[]> {
  const res = await marketGatewayFetch(`/market/news/${symbol.toUpperCase()}`, {
    searchParams: { limit: "8", order: "desc" },
    signal,
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: unknown };
  const raw = Array.isArray(json.data)
    ? json.data
    : json.data && typeof json.data === "object" && Array.isArray((json.data as { results?: unknown[] }).results)
      ? (json.data as { results: unknown[] }).results
      : [];
  const items: MarketNewsItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const a = row as Record<string, unknown>;
    const title = typeof a.title === "string" ? a.title.trim() : "";
    if (!title) continue;
    const published =
      typeof a.published_utc === "string"
        ? a.published_utc
        : typeof a.published_at === "string"
          ? a.published_at
          : "";
    let source = "News";
    if (typeof a.publisher === "object" && a.publisher && "name" in (a.publisher as object)) {
      const name = (a.publisher as { name?: unknown }).name;
      if (typeof name === "string") source = name;
    }
    if (typeof a.source === "string") source = a.source;
    items.push({
      title,
      source,
      time: published ? formatNewsTime(published) : "",
      publishedAt: published,
      url: typeof a.article_url === "string" ? a.article_url : typeof a.url === "string" ? a.url : "#",
    });
  }
  return items;
}

export function compute52WeekRange(points: PricePoint[]): { high: number | null; low: number | null } {
  const yearPoints = points.slice(-252);
  if (!yearPoints.length) return { high: null, low: null };
  let high = -Infinity;
  let low = Infinity;
  for (const p of yearPoints) {
    if (p.price > high) high = p.price;
    if (p.price < low) low = p.price;
  }
  return {
    high: Number.isFinite(high) ? high : null,
    low: Number.isFinite(low) ? low : null,
  };
}
