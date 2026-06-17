import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCooldown } from "@/hooks/useCooldown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  PartyPopper,
  Bell,
  X,
  Star,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Compass,
  Quote,
  Feather,
  Loader2,
  Newspaper,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CircleDollarSign,
  Frown,
  Trash2,
  Bookmark,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { addUserRegret, REGRET_REASONS } from "@/lib/regretUtils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  fetchDashboardIndices,
  fetchDashboardPicks,
  fetchMarketQuote,
  fetchOhlcvSeries,
  fetchMarketNews,
  type DashboardIndex,
  type TopPickRow,
  type PickReturnHorizon,
  type MarketNewsItem,
  type PricePoint,
  type TimePeriod,
  formatPickReturn,
  formatScanDateShort,
  pickReturnHorizonLabel,
} from "@/lib/marketApi";
import {
  buildPortfolioCurve,
  splitWinnersLosers,
  type PortfolioCurvePoint,
} from "@/lib/portfolioUtils";
import { useDelayedPrices } from "@/hooks/useDelayedPrice";
import { consecutiveJournalDays } from "@/lib/journalStreak";
import { averageMood, type JournalEntryView } from "@/lib/journalUtils";
import { fetchProfilePurpose } from "@/lib/purposeUtils";
import {
  POINTS_PER_JOURNAL_ENTRY,
  rewardLevelFromPoints,
  rewardLevelLabel,
  nextLevelThresholdPoints,
} from "@/lib/rewards";
import { format, parseISO } from "date-fns";

// Trailing-return window for each pick (via /market/returns — supported horizons only).
// Pick vintage: how long ago the cohort was picked. The list swaps to that scan;
// the return shown is each pick's realized return since it was picked.
const PICK_HORIZONS: Array<{ id: PickReturnHorizon; label: string }> = [
  { id: "latest", label: "Today" },
  { id: "1w", label: "1W ago" },
  { id: "1m", label: "1M ago" },
];

// Performance-chart ranges, each backed by a real OHLCV window (see mapPeriodToOhlcvParams).
const CHART_PERIODS: Array<{ id: TimePeriod; label: string }> = [
  { id: "6M", label: "6M" },
  { id: "YTD", label: "YTD" },
  { id: "1Y", label: "1Y" },
  { id: "5Y", label: "All" },
];

// How many holdings (highest value first) to pull news for — caps the API fan-out.
const NEWS_SYMBOL_LIMIT = 5;
// Only nudge a cooldown when a holding has run up meaningfully.
const COOLDOWN_GAIN_THRESHOLD = 15;

const popular = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOG"];

// "Markets at a glance" groups — one shown at a time, 3 symbols + a 3-month chart.
const MARKET_CATEGORIES: Array<{ label: string; symbols: string[] }> = [
  { label: "Indices", symbols: ["SPY", "QQQ", "DJIA"] },
  { label: "Commodities", symbols: ["GLD", "SLV", "USO"] },
  { label: "Treasuries", symbols: ["SHY", "IEF", "TLT"] },
];
const MARKET_SERIES_COLORS = ["hsl(var(--accent-deep))", "hsl(var(--positive))", "hsl(var(--negative))"];

/** Merge per-symbol price series into one chart dataset, each rebased to % from start. */
function buildMarketChart(seriesBySymbol: Record<string, PricePoint[]>): Array<Record<string, number | string>> {
  const normalized: Record<string, Map<string, number>> = {};
  const dateSet = new Set<string>();
  for (const [sym, series] of Object.entries(seriesBySymbol)) {
    const base = series[0]?.price;
    const m = new Map<string, number>();
    if (base) {
      for (const p of series) {
        const day = p.date.slice(0, 10);
        m.set(day, (p.price / base - 1) * 100);
        dateSet.add(day);
      }
    }
    normalized[sym] = m;
  }
  const days = [...dateSet].sort();
  return days.map((day) => {
    const row: Record<string, number | string> = { date: day };
    for (const sym of Object.keys(seriesBySymbol)) {
      const v = normalized[sym].get(day);
      if (v != null) row[sym] = v;
    }
    return row;
  });
}

type HoldingRow = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  entry: number;
  current: number;
  qty: number;
  gain: number;
  momentum: string;
  score: number;
  /** When the holding was added (user_portfolio.created_at) — anchors the value curve. */
  purchaseDate: string | null;
};

// Momentum is purely a function of recent gain vs. entry — labelled honestly, not as buy/sell advice.
const momentumLabel = (score: number) => (score >= 70 ? "High" : score >= 45 ? "Steady" : "Soft");
const momentumStyle = (label: string) =>
  label === "High" ? "text-positive" : label === "Soft" ? "text-negative" : "text-gold-deep";
const momentumBar = (label: string) =>
  label === "High" ? "bg-positive" : label === "Soft" ? "bg-negative" : "bg-gold-deep";

function relativeEntryDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(d, "MMM d");
  } catch {
    return "";
  }
}

const UserDashboard = () => {
  const { user, loading } = useRequireOnboarding();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [markets, setMarkets] = useState<DashboardIndex[]>([]);
  const [marketCat, setMarketCat] = useState(0);
  const [marketChart, setMarketChart] = useState<Array<Record<string, number | string>>>([]);
  const [marketChartLoading, setMarketChartLoading] = useState(true);
  const [picks, setPicks] = useState<TopPickRow[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [pickCount, setPickCount] = useState(0);
  const [pickScanDate, setPickScanDate] = useState<string | null>(null);
  const [pickHorizon, setPickHorizon] = useState<PickReturnHorizon>("latest");
  const [pickPage, setPickPage] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sectorOpen, setSectorOpen] = useState(false);
  const sectorRef = useRef<HTMLDivElement>(null);
  const { shouldShowPrompt, cooldownEnabled } = useCooldown();

  // Journal reflections + insights (real, from journal_entries).
  const [entries, setEntries] = useState<JournalEntryView[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  // The user's stated purpose (from profiles), to remind them why they trade.
  const [purposeStatement, setPurposeStatement] = useState<string | null>(null);
  // Portfolio-relevant headlines for the user's held symbols.
  const [news, setNews] = useState<Array<MarketNewsItem & { symbol: string }>>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  // Real portfolio value curve over the selected window.
  const [chartPeriod, setChartPeriod] = useState<TimePeriod>("1Y");
  const [curve, setCurve] = useState<PortfolioCurvePoint[]>([]);
  const [curveLoading, setCurveLoading] = useState(false);
  // Regret flow: a two-step dialog (record reason → invite journaling).
  const [regretFor, setRegretFor] = useState<HoldingRow | null>(null);
  const [regretReason, setRegretReason] = useState<string>(REGRET_REASONS[0].value);
  const [regretNote, setRegretNote] = useState("");
  const [regretSaving, setRegretSaving] = useState(false);
  const [regretRecorded, setRegretRecorded] = useState(false);

  // Live-ish (15-min delayed) prices for held symbols, polled while visible + market open.
  const livePrices = useDelayedPrices(
    holdings.map((h) => h.symbol),
    holdings.length > 0,
  );
  // Merge live prices over the stored daily price; recompute gain/momentum.
  const displayHoldings = useMemo(
    () =>
      holdings.map((h) => {
        const live = livePrices.get(h.symbol.toUpperCase());
        if (!live) return h;
        const current = live.price;
        const gain = h.entry > 0 ? ((current - h.entry) / h.entry) * 100 : 0;
        const score = Math.min(100, Math.max(0, Math.round(50 + gain * 2)));
        return { ...h, current, gain, momentum: momentumLabel(score), score };
      }),
    [holdings, livePrices],
  );
  const pricesAreLive = livePrices.size > 0;

  const portfolioValue = displayHoldings.reduce((sum, h) => sum + h.current * h.qty, 0);
  const portfolioCost = displayHoldings.reduce((sum, h) => sum + h.entry * h.qty, 0);
  const portfolioGainPct = portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0;

  // Anchor the value curve to "today" at the live portfolio value, so a holding
  // added today (no daily bar yet) still shows its starting point.
  const portfolioCurve = useMemo(() => {
    if (holdings.length === 0 || portfolioValue <= 0) return curve;
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastKey = curve.length ? curve[curve.length - 1].date.slice(0, 10) : null;
    if (lastKey === todayKey) return curve;
    return [...curve, { date: new Date().toISOString(), value: portfolioValue }];
  }, [curve, holdings.length, portfolioValue]);

  // What's doing great / what's not — derived from real holdings.
  const { top: topHolding, bottom: bottomHolding } = splitWinnersLosers(displayHoldings);

  // Journal insights — real points, level, streak, and average mood.
  const rewardPoints = entries.length * POINTS_PER_JOURNAL_ENTRY;
  const rewardLevel = rewardLevelFromPoints(rewardPoints);
  const nextThreshold = nextLevelThresholdPoints(rewardPoints);
  const ptsToNext = nextThreshold ? nextThreshold - rewardPoints : 0;
  const levelProgressPct = nextThreshold ? Math.min(100, (rewardPoints / nextThreshold) * 100) : 100;
  const journalStreak = consecutiveJournalDays(entries.map((e) => e.created_at));
  const avgMood = averageMood(entries);

  // Most recent reflections for the dashboard's quiet record.
  const recentReflections = entries.slice(0, 3).map((e) => ({
    date: relativeEntryDate(e.created_at),
    text: e.content.replace(/^[A-Za-z' ]+:\s*/gm, "").split("\n").filter((l) => l.trim() && l.trim() !== "—")[0] ?? e.title,
    tag: e.tags?.[0] ?? e.mood ?? null,
  }));

  // Paginate the picks, 5 per page. Page 0 shows the #1 as a featured card + 4 rows.
  const PICKS_PER_PAGE = 5;
  const totalPickPages = Math.max(1, Math.ceil(picks.length / PICKS_PER_PAGE));
  const pageStart = pickPage * PICKS_PER_PAGE;
  const pagePicks = picks.slice(pageStart, pageStart + PICKS_PER_PAGE);
  const featuredPick = pickPage === 0 ? pagePicks[0] ?? null : null;
  const listPicks = pickPage === 0 ? pagePicks.slice(1) : pagePicks;

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchPortfolio = async () => {
      setHoldingsLoading(true);
      try {
        const { data } = await supabase.from("user_portfolio").select("*").eq("user_id", user.id);
        if (!data || !data.length) {
          if (!cancelled) setHoldings([]);
          return;
        }
        const rows = await Promise.all(
          data.map(async (item) => {
            const entry = item.purchase_price || 0;
            const symbol = item.asset_name as string;
            let current = item.current_price || entry;
            let displayName = (item.asset_type as string) || symbol;
            try {
              const quote = await fetchMarketQuote(symbol);
              if (quote?.close != null) {
                current = quote.close;
                if (quote.name) displayName = quote.name;
              }
            } catch {
              /* keep stored price */
            }
            const gain = entry > 0 ? ((current - entry) / entry) * 100 : 0;
            const score = Math.min(100, Math.max(0, Math.round(50 + gain * 2)));
            return {
              id: item.id as string,
              symbol,
              name: displayName,
              type: (item.asset_type as string) || "Equity",
              entry,
              current,
              qty: item.quantity || 0,
              gain,
              momentum: momentumLabel(score),
              score,
              purchaseDate: (item.created_at as string | null) ?? null,
            };
          }),
        );
        if (!cancelled) setHoldings(rows);
      } finally {
        if (!cancelled) setHoldingsLoading(false);
      }
    };
    fetchPortfolio();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardIndices(controller.signal).then(setMarkets);
    return () => controller.abort();
  }, []);

  // 3-month trend chart for the active market category (refetched on switch).
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      setMarketChartLoading(true);
      try {
        const symbols = MARKET_CATEGORIES[marketCat].symbols;
        const series = await Promise.all(
          symbols.map(async (s) => [s, await fetchOhlcvSeries(s, "6M", controller.signal)] as const),
        );
        if (cancelled) return;
        const seriesBySymbol: Record<string, PricePoint[]> = {};
        // Use the last ~3 months (≈65 trading days) of each series.
        for (const [s, pts] of series) seriesBySymbol[s] = pts.slice(-65);
        setMarketChart(buildMarketChart(seriesBySymbol));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) console.error("Market chart load failed:", e);
      } finally {
        if (!cancelled) setMarketChartLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [marketCat]);

  // Journal entries (reflections + insights) and the user's stated purpose.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setEntriesLoading(true);
      try {
        const [entriesResult, profile] = await Promise.all([
          supabase
            .from("journal_entries")
            .select("id, title, content, mood, tags, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(60),
          fetchProfilePurpose(user.id),
        ]);
        if (cancelled) return;
        setEntries((entriesResult.data ?? []) as JournalEntryView[]);
        setPurposeStatement(profile?.purpose_statement?.trim() || null);
      } catch (e) {
        if (!cancelled) console.error("Journal/purpose load failed:", e);
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Portfolio-relevant news for the highest-value holdings (capped fan-out).
  useEffect(() => {
    if (holdings.length === 0) {
      setNews([]);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const symbols = [...holdings]
          .sort((a, b) => b.current * b.qty - a.current * a.qty)
          .slice(0, NEWS_SYMBOL_LIMIT)
          .map((h) => h.symbol);
        const perSymbol = await Promise.all(
          symbols.map(async (symbol) => {
            const items = await fetchMarketNews(symbol, controller.signal);
            return items.slice(0, 4).map((item) => ({ ...item, symbol }));
          }),
        );
        if (cancelled) return;
        // Newest headlines across all holdings first — "latest update" view.
        const merged = perSymbol
          .flat()
          .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
        setNews(merged.slice(0, 6));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) console.error("Portfolio news load failed:", e);
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };
    loadNews();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [holdings]);

  // Real portfolio value curve over the selected window, built from OHLCV history.
  useEffect(() => {
    if (holdings.length === 0) {
      setCurve([]);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const loadCurve = async () => {
      setCurveLoading(true);
      try {
        const series = await Promise.all(
          holdings.map(async (h) => ({
            symbol: h.symbol,
            points: await fetchOhlcvSeries(h.symbol, chartPeriod, controller.signal),
          })),
        );
        if (cancelled) return;
        const seriesBySymbol: Record<string, PricePoint[]> = {};
        for (const s of series) seriesBySymbol[s.symbol] = s.points;
        setCurve(buildPortfolioCurve(seriesBySymbol, holdings));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) console.error("Portfolio curve load failed:", e);
      } finally {
        if (!cancelled) setCurveLoading(false);
      }
    };
    loadCurve();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [holdings, chartPeriod]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPicks = async () => {
      setPicksLoading(true);
      try {
        const result = await fetchDashboardPicks({
          limit: 50,
          industry: selectedIndustry,
          horizon: pickHorizon,
          signal: controller.signal,
        });
        setPicks(result.picks);
        setPickCount(result.totalCount);
        setPickScanDate(result.scanDate);
        if (!selectedIndustry) setIndustries(result.industries);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("Picks fetch failed:", e);
      } finally {
        setPicksLoading(false);
      }
    };
    loadPicks();
    return () => controller.abort();
  }, [pickHorizon, selectedIndustry]);

  // Reset to the first page whenever the pick cohort/filter changes.
  useEffect(() => {
    setPickPage(0);
  }, [pickHorizon, selectedIndustry]);

  useEffect(() => {
    if (!sectorOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [sectorOpen]);

  const resetPickFilters = () => {
    setSelectedIndustry(null);
    setPickHorizon("latest");
    setSectorOpen(false);
  };

  // Remove a holding from the active portfolio — used by both "sold" and "remove".
  const removeHolding = async (h: HoldingRow, mode: "sold" | "remove") => {
    if (!user) return;
    const prev = holdings;
    setHoldings((rows) => rows.filter((r) => r.id !== h.id)); // optimistic
    const { error } = await supabase
      .from("user_portfolio")
      .delete()
      .eq("id", h.id)
      .eq("user_id", user.id);
    if (error) {
      setHoldings(prev); // rollback
      toast.error(error.message || "Could not update your portfolio.");
      return;
    }
    toast.success(mode === "sold" ? `Marked ${h.symbol} as sold.` : `Removed ${h.symbol} from your portfolio.`);
  };

  const openRegret = (h: HoldingRow) => {
    setRegretFor(h);
    setRegretReason(REGRET_REASONS[0].value);
    setRegretNote("");
    setRegretRecorded(false);
  };

  const submitRegret = async () => {
    if (!user || !regretFor) return;
    const reasonDef = REGRET_REASONS.find((r) => r.value === regretReason) ?? REGRET_REASONS[0];
    setRegretSaving(true);
    try {
      await addUserRegret(user.id, {
        stockSymbol: regretFor.symbol,
        reason: reasonDef.label,
        reasonCode: reasonDef.value,
        notes: regretNote.trim() || undefined,
        portfolioId: regretFor.id,
      });
      setRegretRecorded(true); // move to the journaling invitation step
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record this regret.");
    } finally {
      setRegretSaving(false);
    }
  };

  const journalThisRegret = () => {
    const symbol = regretFor?.symbol;
    setRegretFor(null);
    // Carry the regret context so the journal can seed a reflection prompt.
    navigate(symbol ? `/journal?reflect=regret&symbol=${symbol}` : "/journal");
  };

  const sectorLabel = selectedIndustry
    ? selectedIndustry
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "All sectors";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) {
      navigate(`/stock/${q}`);
      setSearchQuery("");
    } else {
      toast.error("Please enter a stock symbol");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1">
        {/* Hero */}
        <section className="px-6 pb-10 pt-14 md:px-12">
          <div className="flex items-start justify-between gap-4">
            <p className="font-cap text-sm uppercase tracking-[0.14em] text-gold-deep">
              Purpose-driven investing
            </p>
            <Link
              to="/watchlist"
              aria-label="Open your watchlist"
              title="Watchlist"
              className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border-strong bg-card px-4 py-2 font-cap text-[13px] font-medium text-fg-primary transition-colors hover:border-ink"
            >
              <Bookmark className="h-4 w-4 text-gold-deep" />
              <span className="hidden sm:inline">Watchlist</span>
            </Link>
          </div>
          <h1 className="mt-3.5 font-serif text-[40px] font-medium leading-[1.05] text-fg-primary md:text-[52px]">
            Good morning, {firstName}.
          </h1>
          <p className="mt-2.5 max-w-[620px] text-[17px] text-fg-secondary">
            {holdings.length > 0
              ? `Your portfolio is ${portfolioGainPct >= 0 ? "up" : "down"} ${Math.abs(portfolioGainPct).toFixed(1)}% since entry${pickCount ? `, and ${pickCount} ideas match your filters today` : ""}.`
              : pickCount
                ? `${pickCount} new ideas match your purpose today.`
                : "Search a ticker to analyze, or explore today's picks."}
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-6 flex w-full max-w-[680px] items-center gap-3 rounded-full border border-border-strong bg-card py-1.5 pl-5 pr-1.5"
          >
            <Search className="h-5 w-5 flex-shrink-0 text-fg-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Analyze any stock — type a ticker or company"
              className="h-10 flex-1 bg-transparent text-base text-fg-primary outline-none placeholder:text-fg-muted"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white"
            >
              Analyze <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="font-cap text-[13px] text-fg-muted">Popular</span>
            {popular.map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/stock/${s}`)}
                className="rounded-full border border-border-subtle bg-card px-3.5 py-1.5 font-cap text-[13px] font-medium text-fg-secondary hover:border-border-strong"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Markets */}
        <section className="px-6 pb-7 md:px-12">
          <div className="mb-3.5 flex items-end justify-between">
            <h2 className="font-serif text-[22px] font-medium text-fg-primary">Markets at a glance</h2>
            <span className="font-cap text-xs text-fg-muted">Live · delayed 15 min</span>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMarketCat((c) => (c + MARKET_CATEGORIES.length - 1) % MARKET_CATEGORIES.length)}
                  aria-label="Previous market group"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[96px] text-center font-cap text-[13px] font-semibold uppercase tracking-wide text-gold-deep">
                  {MARKET_CATEGORIES[marketCat].label}
                </span>
                <button
                  type="button"
                  onClick={() => setMarketCat((c) => (c + 1) % MARKET_CATEGORIES.length)}
                  aria-label="Next market group"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="font-cap text-[11px] text-fg-muted">Last 3 months</span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
              {/* 3 symbols */}
              <div className="flex flex-col divide-y divide-border-subtle">
                {MARKET_CATEGORIES[marketCat].symbols.map((sym, i) => {
                  const m = markets.find((x) => x.symbol === sym);
                  return (
                    <div key={sym} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: MARKET_SERIES_COLORS[i] }} />
                        <span className="font-cap text-[13px] text-fg-secondary">{m?.name ?? sym}</span>
                      </span>
                      <span className="flex items-baseline gap-3">
                        <span className="text-sm font-semibold text-fg-primary">{m?.value ?? "…"}</span>
                        <span className={cn("w-[58px] text-right font-cap text-[12px] font-medium", m?.up ?? true ? "text-positive" : "text-negative")}>
                          {m?.change ?? "…"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* 3-month trend */}
              <div className="h-[120px] w-full">
                {marketChartLoading && marketChart.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
                  </div>
                ) : marketChart.length === 0 ? (
                  <div className="flex h-full items-center justify-center font-cap text-xs text-fg-muted">Chart unavailable</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marketChart} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                      <YAxis hide domain={["auto", "auto"]} />
                      {MARKET_CATEGORIES[marketCat].symbols.map((sym, i) => (
                        <Line
                          key={sym}
                          type="monotone"
                          dataKey={sym}
                          stroke={MARKET_SERIES_COLORS[i]}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main band */}
        <section className="grid grid-cols-1 gap-6 px-6 md:px-12 lg:grid-cols-[1fr_400px]">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Performance card */}
            <div className="rounded-2xl border border-border-subtle bg-card p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-cap text-[13px] text-fg-muted">Portfolio value</p>
                  <p className="font-serif text-[42px] font-medium leading-none text-fg-primary">
                    ${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", portfolioGainPct >= 0 ? "bg-positive-soft text-positive" : "bg-negative/10 text-negative")}>
                      {portfolioGainPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {portfolioGainPct >= 0 ? "+" : ""}{portfolioGainPct.toFixed(1)}%
                    </span>
                    <span className="font-cap text-[13px] text-fg-muted">since your average entry</span>
                  </div>
                </div>
                <div className="flex gap-1 rounded-full bg-surface-sunken p-1">
                  {CHART_PERIODS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChartPeriod(t.id)}
                      aria-pressed={chartPeriod === t.id}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 font-cap text-[13px] transition-colors",
                        chartPeriod === t.id ? "bg-card font-semibold text-fg-primary shadow-sm" : "text-fg-muted hover:text-fg-secondary",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 font-cap text-[11px] text-fg-muted">
                Your portfolio's value over time — from when you added each holding
              </p>
              <div className="mt-5 h-[240px] w-full">
                {holdings.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                    <p className="text-sm font-medium text-fg-secondary">No holdings to chart yet</p>
                    <p className="font-cap text-xs text-fg-muted">Add holdings to see your portfolio's path over time.</p>
                  </div>
                ) : curveLoading && portfolioCurve.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
                  </div>
                ) : portfolioCurve.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="font-cap text-xs text-fg-muted">Price history unavailable for this range.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioCurve} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="grow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.34} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" opacity={0.7} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        minTickGap={48}
                        tickFormatter={(d: string) => {
                          try {
                            return format(parseISO(d), "MMM");
                          } catch {
                            return "";
                          }
                        }}
                        tick={{ fill: "hsl(var(--fg-muted))", fontSize: 11 }}
                      />
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--accent-deep))" strokeWidth={2.5} fill="url(#grow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* What's moving — winners / losers at a glance */}
            {holdings.length > 0 && (topHolding || bottomHolding) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {topHolding && (
                  <button
                    type="button"
                    onClick={() => navigate(`/stock/${topHolding.symbol}`)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-positive/20 bg-positive-soft px-5 py-4 text-left transition-colors hover:border-positive/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-positive/15">
                        <ArrowUpRight className="h-4 w-4 text-positive" />
                      </span>
                      <div>
                        <p className="font-cap text-[11px] uppercase tracking-wide text-fg-muted">Doing great</p>
                        <p className="text-sm font-semibold text-fg-primary">{topHolding.symbol}</p>
                      </div>
                    </div>
                    <span className={cn("text-base font-semibold", topHolding.gain >= 0 ? "text-positive" : "text-negative")}>
                      {topHolding.gain >= 0 ? "+" : ""}{topHolding.gain.toFixed(1)}%
                    </span>
                  </button>
                )}
                {bottomHolding && (
                  <button
                    type="button"
                    onClick={() => navigate(`/stock/${bottomHolding.symbol}`)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-negative/20 bg-negative/5 px-5 py-4 text-left transition-colors hover:border-negative/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-negative/10">
                        <ArrowDownRight className="h-4 w-4 text-negative" />
                      </span>
                      <div>
                        <p className="font-cap text-[11px] uppercase tracking-wide text-fg-muted">Needs attention</p>
                        <p className="text-sm font-semibold text-fg-primary">{bottomHolding.symbol}</p>
                      </div>
                    </div>
                    <span className={cn("text-base font-semibold", bottomHolding.gain >= 0 ? "text-positive" : "text-negative")}>
                      {bottomHolding.gain >= 0 ? "+" : ""}{bottomHolding.gain.toFixed(1)}%
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Holdings table */}
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
              <div className="flex items-center justify-between px-7 py-5">
                <div>
                  <h3 className="font-serif text-[22px] font-medium text-fg-primary">Your portfolio</h3>
                  <p className="font-cap text-xs text-fg-muted">
                    {holdings.length} holdings · framed against your entry price
                    {pricesAreLive ? " · live · delayed 15 min" : ""}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 font-cap text-[13px] font-medium text-ink">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-[1fr_84px_84px_90px_56px_88px_140px_32px] gap-2 border-y border-border-subtle bg-surface-sunken px-7 py-2.5 font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                <span>Holding</span><span>Type</span><span>Entry</span><span>Current</span><span>Qty</span><span>Gain</span><span>Momentum</span><span className="sr-only">Actions</span>
              </div>
              {holdingsLoading && holdings.length === 0 ? (
                <p className="px-7 py-8 text-center font-cap text-sm text-fg-muted">Loading your holdings…</p>
              ) : holdings.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-7 py-10 text-center">
                  <p className="text-sm font-medium text-fg-secondary">No holdings yet</p>
                  <p className="font-cap text-xs text-fg-muted">Analyze a stock to start tracking it against your entry price.</p>
                </div>
              ) : null}
              {displayHoldings.map((h) => (
                <div
                  key={h.symbol}
                  className="grid grid-cols-[1fr_84px_84px_90px_56px_88px_140px_32px] items-center gap-2 border-b border-border-subtle px-7 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-sunken font-serif text-base font-semibold text-gold-deep">
                      {h.symbol[0]}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-fg-primary">{h.symbol}</div>
                      <div className="font-cap text-[11px] text-fg-muted">{h.name}</div>
                    </div>
                  </div>
                  <span className="font-cap text-[13px] text-fg-secondary">{h.type}</span>
                  <span className="text-[13px] text-fg-secondary">${h.entry.toFixed(2)}</span>
                  <span className="text-[13px] font-medium text-fg-primary">${h.current.toFixed(2)}</span>
                  <span className="text-[13px] text-fg-secondary">{h.qty}</span>
                  <span className={cn("text-sm font-semibold", h.gain >= 0 ? "text-positive" : "text-negative")}>
                    {h.gain >= 0 ? "+" : ""}{h.gain.toFixed(1)}%
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className={cn("font-cap text-xs font-semibold", momentumStyle(h.momentum))}>{h.momentum}</span>
                      <span className="font-cap text-[11px] text-fg-muted">{h.score}/100</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <div className={cn("h-1.5 rounded-full", momentumBar(h.momentum))} style={{ width: `${h.score}%` }} />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${h.symbol}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => removeHolding(h, "sold")}>
                        <CircleDollarSign className="mr-2 h-4 w-4 text-positive" /> Mark as sold
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openRegret(h)}>
                        <Frown className="mr-2 h-4 w-4 text-gold-deep" /> I regret this
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => removeHolding(h, "remove")} className="text-negative focus:text-negative">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove from portfolio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>

            {/* Portfolio news */}
            {holdings.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
                <div className="flex items-center justify-between px-7 py-5">
                  <div>
                    <h3 className="flex items-center gap-2 font-serif text-[22px] font-medium text-fg-primary">
                      <Newspaper className="h-5 w-5 text-gold-deep" /> News on your holdings
                    </h3>
                    <p className="font-cap text-xs text-fg-muted">Latest headlines for the names you own</p>
                  </div>
                </div>
                {newsLoading && news.length === 0 ? (
                  <p className="border-t border-border-subtle px-7 py-8 text-center font-cap text-sm text-fg-muted">
                    Loading headlines…
                  </p>
                ) : news.length === 0 ? (
                  <p className="border-t border-border-subtle px-7 py-8 text-center font-cap text-sm text-fg-muted">
                    No recent news for your holdings.
                  </p>
                ) : (
                  news.map((item, i) => (
                    <a
                      key={`${item.symbol}-${i}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 border-t border-border-subtle px-7 py-4 transition-colors hover:bg-surface-primary"
                    >
                      <span className="mt-0.5 flex-shrink-0 rounded-md bg-surface-sunken px-2 py-1 font-cap text-[11px] font-semibold text-gold-deep">
                        {item.symbol}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-snug text-fg-primary group-hover:text-ink">{item.title}</p>
                        <p className="mt-1 font-cap text-[11px] text-fg-muted">
                          {item.source}{item.time ? ` · ${item.time}` : ""}
                        </p>
                      </div>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Picks card */}
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
              <div className="flex flex-col gap-1 px-6 pb-4 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-[22px] font-medium text-fg-primary">Today's top picks</h3>
                  <button
                    type="button"
                    onClick={resetPickFilters}
                    className="flex items-center gap-1 font-cap text-xs text-fg-muted transition-colors hover:text-fg-primary"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
                <p className="font-cap text-xs text-fg-muted">
                  {picksLoading
                    ? "Loading picks…"
                    : pickScanDate
                      ? `Vegas Channel scan · ${formatScanDateShort(pickScanDate)} · ${pickCount} idea${pickCount === 1 ? "" : "s"}`
                      : `Vegas Channel scan · ${pickCount} idea${pickCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 border-y border-border-subtle bg-surface-primary px-6 py-3.5">
                <div ref={sectorRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSectorOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-md border border-border-subtle bg-card px-3.5 py-2.5 text-left transition-colors hover:border-border-strong"
                  >
                    <span className="flex items-center gap-2 text-[13px] text-fg-secondary">
                      <Layers className="h-3.5 w-3.5 text-fg-muted" /> {sectorLabel}
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-fg-muted transition-transform", sectorOpen && "rotate-180")} />
                  </button>
                  {sectorOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-border-subtle bg-card py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIndustry(null);
                          setSectorOpen(false);
                        }}
                        className={cn(
                          "block w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-primary",
                          !selectedIndustry ? "font-semibold text-fg-primary" : "text-fg-secondary",
                        )}
                      >
                        All sectors
                      </button>
                      {industries.map((ind) => (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => {
                            setSelectedIndustry(ind);
                            setSectorOpen(false);
                          }}
                          className={cn(
                            "block w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-primary",
                            selectedIndustry === ind ? "font-semibold text-fg-primary" : "text-fg-secondary",
                          )}
                        >
                          {ind
                            .split(/\s+/)
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(" ")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {PICK_HORIZONS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPickHorizon(id)}
                      className={cn(
                        "flex-1 rounded-full py-1.5 text-center font-cap text-xs font-semibold transition-colors",
                        pickHorizon === id
                          ? "bg-ink text-white"
                          : "border border-border-subtle bg-card text-fg-secondary hover:border-border-strong",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {featuredPick && (
              <div className="flex flex-col gap-3.5 px-6 py-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 font-cap text-[11px] font-semibold text-fg-primary"><Star className="h-3 w-3" /> Pick of the day</span>
                  <span className="font-cap text-[11px] text-fg-muted">Rank {featuredPick.rank} / {pickCount || featuredPick.rank}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-serif text-3xl font-semibold text-fg-primary">{featuredPick.symbol}</div>
                    <div className="font-cap text-xs text-fg-muted">{featuredPick.name} · {featuredPick.sector}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-fg-primary">
                      {featuredPick.close != null ? `$${featuredPick.close.toFixed(2)}` : "—"}
                    </div>
                    <div className={cn("font-cap text-xs font-semibold", featuredPick.up ? "text-positive" : "text-negative")}>
                      {formatPickReturn(featuredPick.returnPct)}
                    </div>
                    <div className="font-cap text-[10px] text-fg-muted">
                      {pickReturnHorizonLabel(pickHorizon, pickScanDate ?? featuredPick.scanDate)}
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate(`/stock/${featuredPick.symbol}`)} className="flex items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white">
                  Analyze {featuredPick.symbol} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              )}
              {picks.length === 0 && !picksLoading && (
                <p className="px-6 py-5 font-cap text-sm text-fg-muted">
                  {pickHorizon === "latest"
                    ? "No picks available right now."
                    : "No scan ran that far back yet — pick history is still building."}
                </p>
              )}
              {listPicks.map((p) => (
                <button
                  key={p.symbol}
                  onClick={() => navigate(`/stock/${p.symbol}`)}
                  className="flex w-full items-center gap-3 border-t border-border-subtle px-6 py-3.5 text-left hover:bg-surface-primary"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken font-cap text-xs font-semibold text-fg-secondary">{p.rank}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-fg-primary">{p.symbol}</span>
                      <span className="font-cap text-xs text-fg-muted">{p.name}</span>
                    </div>
                    <span className="font-cap text-[11px] text-fg-muted">{p.sector}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("font-cap text-[13px] font-semibold", p.up ? "text-positive" : "text-negative")}>
                      {formatPickReturn(p.returnPct)}
                    </span>
                    <span className="font-cap text-[10px] text-fg-muted">
                      {pickReturnHorizonLabel(pickHorizon, p.scanDate)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-fg-muted" />
                </button>
              ))}
              {picks.length > 0 && totalPickPages > 1 && (
                <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3.5">
                  <button
                    type="button"
                    onClick={() => setPickPage((p) => Math.max(0, p - 1))}
                    disabled={pickPage === 0}
                    className="flex items-center gap-1 font-cap text-[13px] font-medium text-fg-secondary transition-colors hover:text-fg-primary disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <span className="font-cap text-[12px] text-fg-muted">
                    Page {pickPage + 1} of {totalPickPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickPage((p) => Math.min(totalPickPages - 1, p + 1))}
                    disabled={pickPage >= totalPickPages - 1}
                    className="flex items-center gap-1 font-cap text-[13px] font-medium text-fg-secondary transition-colors hover:text-fg-primary disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Purpose card */}
            <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6">
              <span className="flex items-center gap-2 font-cap text-xs uppercase tracking-wide text-gold-tertiary">
                <Compass className="h-4 w-4" /> Your purpose
              </span>
              {purposeStatement ? (
                <>
                  <p className="font-serif text-xl italic leading-snug text-white">
                    “{purposeStatement}”
                  </p>
                  <Link to="/goals" className="flex items-center gap-1.5 font-cap text-[13px] font-medium text-gold-tertiary">
                    Review my goals <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-serif text-xl italic leading-snug text-white/90">
                    Why are you investing? Naming your purpose keeps your decisions steady.
                  </p>
                  <Link to="/goals" className="flex items-center gap-1.5 font-cap text-[13px] font-medium text-gold-tertiary">
                    Set your purpose <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Wisdom card */}
            <div className="flex flex-col gap-3.5 rounded-2xl border border-border-subtle bg-card p-6">
              <Quote className="h-[22px] w-[22px] text-gold" />
              <p className="font-serif text-[19px] leading-snug text-fg-primary">
                The stock market is a device for transferring money from the impatient to the patient.
              </p>
              <div className="flex items-center justify-between">
                <span className="font-cap text-[13px] text-fg-muted">— Warren Buffett</span>
                <div className="flex gap-1.5">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-sunken"><ChevronLeft className="h-3.5 w-3.5 text-fg-secondary" /></span>
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-sunken"><ChevronRight className="h-3.5 w-3.5 text-fg-secondary" /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cooldown band — surfaced when a real holding has run up meaningfully */}
        {shouldShowPrompt && cooldownEnabled && topHolding && topHolding.gain >= COOLDOWN_GAIN_THRESHOLD && (
          <section className="px-6 pt-6 md:px-12">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-positive/20 bg-positive-soft px-5 py-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-positive/15">
                  <PartyPopper className="h-[18px] w-[18px] text-positive" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-fg-primary">
                    Great win on {topHolding.symbol} — up {topHolding.gain.toFixed(0)}% from your entry.
                  </p>
                  <p className="font-cap text-[13px] text-fg-secondary">Wins can tempt overtrading. Consider a 24-hour cooldown before your next move.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="flex items-center gap-1.5 rounded-full bg-positive px-4 py-2.5 font-cap text-[13px] font-semibold text-white">
                  <Bell className="h-3.5 w-3.5" /> Remind me in 24h
                </button>
                <button className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-positive/25 text-positive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Reflections */}
        <section className="px-6 pb-14 pt-8 md:px-12">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-[28px] font-medium text-fg-primary">Your reflections</h2>
              <p className="text-[15px] text-fg-secondary">A quiet record of how you thought — not just what you traded.</p>
            </div>
            <Link to="/journal" className="flex items-center gap-1.5 font-cap text-sm font-medium text-ink">
              Open journal <ArrowRight className="h-[15px] w-[15px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
            {/* Entries */}
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Recent entries</span>
                <span className="font-cap text-xs text-fg-muted">
                  {entries.length} saved
                </span>
              </div>
              {entriesLoading && entries.length === 0 ? (
                <p className="px-6 py-10 text-center font-cap text-sm text-fg-muted">Loading your reflections…</p>
              ) : recentReflections.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-fg-secondary">No reflections yet</p>
                  <p className="font-cap text-xs text-fg-muted">Your first entry starts the quiet record of how you think.</p>
                  <Link to="/journal" className="mt-1 flex items-center gap-1.5 font-cap text-[13px] font-medium text-ink">
                    <Feather className="h-3.5 w-3.5" /> Write your first reflection
                  </Link>
                </div>
              ) : (
                recentReflections.map((r, i) => (
                  <div key={i} className="flex gap-4 border-b border-border-subtle px-6 py-4 last:border-b-0">
                    <div className="w-24 flex-shrink-0">
                      <div className="text-sm font-semibold text-fg-primary">{r.date}</div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-sm leading-relaxed text-fg-secondary">{r.text}</p>
                      {r.tag && (
                        <span className="w-fit rounded-full bg-surface-sunken px-2.5 py-1 font-cap text-[11px] text-fg-secondary">{r.tag}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right side */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card p-6">
                <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Journal insights</span>
                <div className="grid grid-cols-3 divide-x divide-border-subtle">
                  {[
                    { v: String(entries.length), l: "Entries" },
                    { v: String(journalStreak), l: "Day streak" },
                    { v: avgMood ?? "—", l: "Avg mood" },
                  ].map((s) => (
                    <div key={s.l} className="flex flex-col items-center gap-1 px-1">
                      <span className="font-serif text-2xl font-medium text-fg-primary">{s.v}</span>
                      <span className="font-cap text-[11px] text-fg-muted">{s.l}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg-primary">Level {rewardLevel} · {rewardLevelLabel(rewardLevel)}</span>
                    <span className="font-cap text-xs text-fg-muted">{rewardPoints} pts</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-2 rounded-full bg-gold-deep" style={{ width: `${levelProgressPct}%` }} />
                  </div>
                  <span className="font-cap text-[11px] text-fg-muted">
                    {nextThreshold ? `${ptsToNext} pts to Level ${rewardLevel + 1}` : "Top tier reached"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 rounded-2xl bg-gold p-6">
                <h3 className="font-serif text-[22px] font-medium text-fg-primary">Capture today's thinking</h3>
                <p className="text-[13px] leading-relaxed text-fg-primary/80">
                  A two-minute reflection keeps your decisions honest — and earns you +25 points.
                </p>
                <Link to="/journal" className="flex items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white">
                  <Feather className="h-[15px] w-[15px]" /> Write a reflection
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Regret flow: record the reason, then invite a reflection in the journal */}
      <Dialog open={regretFor !== null} onOpenChange={(open) => !open && setRegretFor(null)}>
        <DialogContent>
          {!regretRecorded ? (
            <>
              <DialogHeader>
                <DialogTitle>What do you regret about {regretFor?.symbol}?</DialogTitle>
                <DialogDescription>
                  Naming it honestly is the first step — you'll get a chance to reflect on it next.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {REGRET_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRegretReason(r.value)}
                      aria-pressed={regretReason === r.value}
                      className={cn(
                        "rounded-full px-4 py-2 font-cap text-[13px] font-medium transition-colors",
                        regretReason === r.value
                          ? "bg-ink text-white"
                          : "border border-border-subtle bg-card text-fg-secondary hover:border-border-strong",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={regretNote}
                  onChange={(e) => setRegretNote(e.target.value)}
                  placeholder="Optional — what would you do differently?"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <button
                  onClick={() => setRegretFor(null)}
                  className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRegret}
                  disabled={regretSaving}
                  className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {regretSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Frown className="h-4 w-4" />}
                  {regretSaving ? "Recording…" : "Record regret"}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Recorded. Now turn it into a lesson.</DialogTitle>
                <DialogDescription>
                  Writing down why keeps the same regret from repeating. A two-minute reflection is enough.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button
                  onClick={() => setRegretFor(null)}
                  className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary"
                >
                  Maybe later
                </button>
                <button
                  onClick={journalThisRegret}
                  className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <Feather className="h-4 w-4" /> Write a reflection
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
