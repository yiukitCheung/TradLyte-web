import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegretWarning from "@/components/RegretWarning";
import RegretSystem from "@/components/RegretSystem";
import PurposeAlignmentCheck from "@/components/PurposeAlignmentCheck";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Plus,
  Check,
  Loader2,
  Send,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  checkSimilarRegrets,
  fetchUserRegrets,
  hasRegretForPortfolio,
  hasRegretForSymbol,
  type Regret,
} from "@/lib/regretUtils";
import {
  type TimePeriod,
  type MarketQuoteItem,
  type PricePoint,
  fetchMarketQuote,
  fetchOhlcvSeries,
  fetchMarketNews,
  compute52WeekRange,
  formatCurrency,
  formatMarketCap,
  toSafeNumber,
} from "@/lib/marketApi";
import { cn } from "@/lib/utils";
import { ANALYST_SYSTEM_PROMPT, requestAiChat, toAiMessages } from "@/lib/aiChat";

const stockNames: Record<string, string> = {
  AAPL: "Apple Inc.",
  GOOGL: "Alphabet Inc.",
  MSFT: "Microsoft Corporation",
  AMZN: "Amazon.com Inc.",
  TSLA: "Tesla Inc.",
  META: "Meta Platforms Inc.",
  NVDA: "NVIDIA Corporation",
  AVGO: "Broadcom Inc.",
};

const Sparkline = ({ up }: { up: boolean }) => {
  const bars = useMemo(() => Array.from({ length: 8 }, () => 8 + Math.random() * 22), []);
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", up ? "bg-positive/70" : "bg-negative/70")}
          style={{ height: h }}
        />
      ))}
    </div>
  );
};

const StockDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isInPortfolio, setIsInPortfolio] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [buyInPrice, setBuyInPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isAdding, setIsAdding] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>("1Y");
  const [chatInput, setChatInput] = useState("");
  const [purposeAlignment, setPurposeAlignment] = useState<{ aligned: string; reason: string } | null>(null);
  const [similarRegret, setSimilarRegret] = useState<Regret | null>(null);
  const [userRegrets, setUserRegrets] = useState<Regret[]>([]);
  const [portfolioItemId, setPortfolioItemId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const [initialAnalysis, setInitialAnalysis] = useState<string | null>(null);
  const [initialAnalysisLoading, setInitialAnalysisLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<MarketQuoteItem | null>(null);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [yearRange, setYearRange] = useState<{ high: number | null; low: number | null }>({ high: null, low: null });
  const [marketLoading, setMarketLoading] = useState(true);
  const [news, setNews] = useState<{ title: string; source: string; time: string; url: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const sym = symbol || "AAPL";
  const name = quoteData?.name || stockNames[sym] || `${sym}`;
  const last = toSafeNumber(quoteData?.close) ?? priceData[priceData.length - 1]?.price ?? null;
  const first = priceData[0]?.price ?? toSafeNumber(quoteData?.open);
  const change = last != null && first != null ? last - first : 0;
  const changePct = first && first !== 0 ? (change / first) * 100 : 0;
  const score = user ? 78 : 72;
  const scoreLabel = score >= 80 ? "Strong Buy" : score >= 60 ? "Buy" : score >= 40 ? "Hold" : "Sell";

  const stockContext = useMemo(() => {
    const lines = [
      `Symbol: ${sym}`,
      name !== sym ? `Company: ${name}` : null,
      quoteData?.type ? `Security type: ${quoteData.type}` : null,
      quoteData?.industry ? `Industry: ${quoteData.industry}` : null,
      quoteData?.primary_exchange ? `Exchange: ${quoteData.primary_exchange}` : null,
      quoteData?.as_of_date ? `Data as of: ${quoteData.as_of_date}` : null,
      last != null ? `Price: $${last.toFixed(2)}` : null,
      changePct !== 0 ? `Period change (${period}): ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : null,
      yearRange.high != null ? `52-week high: $${yearRange.high.toFixed(2)}` : null,
      yearRange.low != null ? `52-week low: $${yearRange.low.toFixed(2)}` : null,
      quoteData?.volume != null ? `Volume: ${quoteData.volume.toLocaleString()}` : null,
      quoteData?.market_cap != null ? `Market cap: ${formatMarketCap(quoteData.market_cap)}` : null,
      `TradLyte score: ${score}/100 (${scoreLabel})`,
      isInPortfolio ? "Status: already in user's portfolio" : null,
    ];
    if (news.length > 0) {
      lines.push(
        `Recent headlines:\n${news
          .slice(0, 4)
          .map((n) => `- ${n.title}${n.source ? ` (${n.source})` : ""}`)
          .join("\n")}`,
      );
    }
    return lines.filter(Boolean).join("\n");
  }, [sym, name, quoteData, last, changePct, period, yearRange, score, scoreLabel, isInPortfolio, news]);

  const fundamentals = useMemo(
    () => [
      { label: "Open", value: formatCurrency(toSafeNumber(quoteData?.open)), delta: "today", up: true },
      { label: "Day high", value: formatCurrency(toSafeNumber(quoteData?.high)), delta: "today", up: true },
      { label: "Day low", value: formatCurrency(toSafeNumber(quoteData?.low)), delta: "today", up: false },
      { label: "Volume", value: quoteData?.volume != null ? quoteData.volume.toLocaleString() : "N/A", delta: "today", up: true },
      { label: "52w high", value: formatCurrency(yearRange.high), delta: "1Y", up: true },
      { label: "Mkt cap", value: formatMarketCap(quoteData?.market_cap ?? null), delta: quoteData?.industry ?? "—", up: true },
    ],
    [quoteData, yearRange],
  );

  const quickPrompts = [
    "Is this a good entry point?",
    "How does it fit my portfolio?",
    "What are the risks?",
    "Compare with peers",
  ];

  useEffect(() => {
    if (!symbol) navigate("/dashboard");
  }, [symbol, navigate]);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    const loadMarket = async () => {
      setMarketLoading(true);
      try {
        const [quote, series, yearSeries] = await Promise.all([
          fetchMarketQuote(symbol, controller.signal),
          fetchOhlcvSeries(symbol, period, controller.signal),
          fetchOhlcvSeries(symbol, "1Y", controller.signal),
        ]);
        setQuoteData(quote);
        setPriceData(series);
        setYearRange(compute52WeekRange(yearSeries));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("Market fetch failed:", e);
        toast.error("Could not load live market data");
      } finally {
        setMarketLoading(false);
      }
    };
    loadMarket();
    return () => controller.abort();
  }, [symbol, period]);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const items = await fetchMarketNews(symbol, controller.signal);
        setNews(items);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setNews([]);
      } finally {
        setNewsLoading(false);
      }
    };
    loadNews();
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    if (!user) {
      setUserRegrets([]);
      setSimilarRegret(null);
      return;
    }

    let cancelled = false;
    const loadRegrets = async () => {
      const regrets = await fetchUserRegrets(user.id);
      if (cancelled) return;
      setUserRegrets(regrets);
      setSimilarRegret(checkSimilarRegrets(sym, regrets, quoteData?.industry ?? undefined));
    };

    loadRegrets();
    return () => {
      cancelled = true;
    };
  }, [user, sym, quoteData?.industry]);

  useEffect(() => {
    const check = async () => {
      if (!user || !symbol) {
        setPortfolioLoading(false);
        setPortfolioItemId(null);
        return;
      }
      const { data } = await supabase
        .from("user_portfolio")
        .select("id")
        .eq("user_id", user.id)
        .eq("asset_name", symbol)
        .maybeSingle();
      setIsInPortfolio(!!data);
      setPortfolioItemId(data?.id ?? null);
      setPortfolioLoading(false);
    };
    if (!authLoading) check();
  }, [user, symbol, authLoading]);

  const reloadRegrets = useCallback(async () => {
    if (!user) return;
    const regrets = await fetchUserRegrets(user.id);
    setUserRegrets(regrets);
    setSimilarRegret(checkSimilarRegrets(sym, regrets, quoteData?.industry ?? undefined));
  }, [user, sym, quoteData?.industry]);

  const holdingHasRegret =
    (portfolioItemId && hasRegretForPortfolio(userRegrets, portfolioItemId)) ||
    hasRegretForSymbol(userRegrets, sym);

  useEffect(() => {
    if (!user || marketLoading || !quoteData) {
      setInitialAnalysis(null);
      return;
    }

    let cancelled = false;
    const loadInitial = async () => {
      setInitialAnalysisLoading(true);
      setInitialAnalysis(null);
      try {
        const text = await requestAiChat({
          system: ANALYST_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Give a brief opening take on this stock for a logged-in investor. Context:\n${stockContext}`,
                },
              ],
            },
          ],
        });
        if (!cancelled) setInitialAnalysis(text);
      } catch (e) {
        console.error("Stock AI analysis failed:", e);
        if (!cancelled) {
          setInitialAnalysis(
            `${sym} scores ${score}/100 — a ${scoreLabel}. Ask a question below for a personalized read.`,
          );
        }
      } finally {
        if (!cancelled) setInitialAnalysisLoading(false);
      }
    };

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [user, sym, stockContext, marketLoading, quoteData, score, scoreLabel]);

  const handleAddToPortfolio = async () => {
    if (!user || !symbol || !purposeAlignment) return;
    const price = parseFloat(buyInPrice);
    const qty = parseFloat(quantity);
    if (isNaN(price) || price <= 0) return toast.error("Please enter a valid buy-in price");
    if (isNaN(qty) || qty <= 0) return toast.error("Please enter a valid quantity");
    setIsAdding(true);
    const { error } = await supabase.from("user_portfolio").insert({
      user_id: user.id,
      asset_name: symbol,
      asset_type: "stock",
      purchase_price: price,
      current_price: last ?? 0,
      quantity: qty,
    });
    setIsAdding(false);
    if (error) return toast.error(error.message || "Failed to add to portfolio");
    setIsInPortfolio(true);
    setAddDialogOpen(false);
    setPurposeAlignment(null);
    setBuyInPrice("");
    setQuantity("1");
    toast.success(`${symbol} added to your portfolio!`);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatThinking) return;
    if (!user) {
      toast.error("Sign in to chat with TradLyte AI");
      return;
    }

    const q = chatInput.trim();
    setChatInput("");
    const nextHistory = [...messages, { role: "user" as const, text: q }];
    setMessages(nextHistory);
    setChatThinking(true);

    try {
      const text = await requestAiChat({
        system: ANALYST_SYSTEM_PROMPT,
        messages: [
          ...toAiMessages(nextHistory.slice(0, -1)),
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Stock context:\n${stockContext}\n\nQuestion: ${q}`,
              },
            ],
          },
        ],
      });
      setMessages((m) => [...m, { role: "ai", text }]);
    } catch (e) {
      console.error("AI chat failed:", e);
      toast.error("TradLyte AI is unavailable right now");
      setMessages((m) => m.slice(0, -1));
      setChatInput(q);
    } finally {
      setChatThinking(false);
    }
  };

  const up = change >= 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-10 md:px-12">
        {/* Sub header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-cap text-[13px] text-fg-secondary hover:text-fg-primary">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="h-[18px] w-px bg-border-strong" />
            <div className="flex items-center gap-1.5 font-cap text-[13px] text-fg-muted">
              <Link to="/dashboard" className="hover:text-fg-primary">Dashboard</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-fg-primary">{sym}</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-sunken px-3 py-1.5 font-cap text-[12.5px] font-medium text-fg-secondary">
            <Activity className="h-3.5 w-3.5 text-gold-deep" /> Analytical view
          </span>
        </div>
        <div className="h-[1.5px] w-full bg-fg-primary" />

        {/* Regret warning */}
        {similarRegret && (
          <div className="pt-6">
            <RegretWarning regret={similarRegret} onDismiss={() => setSimilarRegret(null)} />
          </div>
        )}

        {/* Overview band */}
        <div className="grid grid-cols-1 gap-6 pt-7 lg:grid-cols-[460px_1fr]">
          {/* Identity panel */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-7">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-5xl font-semibold text-fg-primary">{sym}</h1>
                <p className="mt-1 text-fg-secondary">{name}</p>
              </div>
              {user && !authLoading && (
                portfolioLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
                ) : isInPortfolio ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-positive/40 px-3 py-1.5 font-cap text-xs font-medium text-positive">
                    <Check className="h-3 w-3" /> In portfolio
                  </span>
                ) : null
              )}
            </div>
            <span className="w-fit rounded-full bg-surface-sunken px-3 py-1.5 font-cap text-[13px] text-fg-secondary">
              {quoteData?.industry ?? "—"} · {quoteData?.primary_exchange ?? "—"}
            </span>
            <div className="flex items-end gap-3">
              <span className="font-serif text-4xl font-medium text-fg-primary">
                {last != null ? `$${last.toFixed(2)}` : marketLoading ? "…" : "N/A"}
              </span>
              <span className={cn("mb-1 flex items-center gap-1 font-semibold", up ? "text-positive" : "text-negative")}>
                {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {up ? "+" : ""}{change.toFixed(2)} ({changePct.toFixed(2)}%)
              </span>
            </div>
            <span className="font-cap text-xs text-fg-muted">Today · delayed 15 min</span>
            <div className="h-px w-full bg-border-subtle" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-cap text-xs text-fg-muted">Tradlyte conviction</span>
                <span className={cn("font-cap text-sm font-semibold", score >= 80 ? "text-positive" : "text-gold-deep")}>
                  {scoreLabel} · {score}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div className={cn("h-2 rounded-full", score >= 80 ? "bg-positive" : "bg-gold-deep")} style={{ width: `${score}%` }} />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
              {user && isInPortfolio && (
                <RegretSystem
                  stockSymbol={sym}
                  industry={quoteData?.industry ?? undefined}
                  portfolioId={portfolioItemId}
                  alreadyMarked={holdingHasRegret}
                  onRegretAdded={reloadRegrets}
                />
              )}
              <div className="flex items-center gap-3">
              {user && !isInPortfolio ? (
                <Dialog
                  open={addDialogOpen}
                  onOpenChange={(o) => {
                    setAddDialogOpen(o);
                    if (!o) {
                      setPurposeAlignment(null);
                      setBuyInPrice("");
                      setQuantity("1");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white">
                      <Plus className="h-4 w-4" /> Add to portfolio
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add {sym} to portfolio</DialogTitle>
                      <DialogDescription>Let's check purpose alignment first, then enter your details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {!purposeAlignment ? (
                        <PurposeAlignmentCheck
                          stockSymbol={sym}
                          onComplete={(a) => setPurposeAlignment(a)}
                          onSkip={() => setPurposeAlignment({ aligned: "not_sure", reason: "" })}
                        />
                      ) : (
                        <>
                          <div className="rounded-md border border-gold/30 bg-gold/5 p-3">
                            <p className="text-sm text-fg-muted">Purpose alignment:</p>
                            <p className="text-sm font-medium capitalize text-fg-primary">{purposeAlignment.aligned.replace("_", " ")}</p>
                            {purposeAlignment.reason && <p className="mt-1 text-xs italic text-fg-muted">"{purposeAlignment.reason}"</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-fg-primary" htmlFor="buyInPrice">Buy-in price ($)</label>
                            <input id="buyInPrice" type="number" step="0.01" min="0" placeholder={last?.toString() ?? ""} value={buyInPrice} onChange={(e) => setBuyInPrice(e.target.value)} className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-fg-primary" htmlFor="quantity">Quantity (shares)</label>
                            <input id="quantity" type="number" step="1" min="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none" />
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <button onClick={() => setAddDialogOpen(false)} className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary">Cancel</button>
                      {purposeAlignment && (
                        <button onClick={handleAddToPortfolio} disabled={isAdding || !buyInPrice || !quantity} className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                          {isAdding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Add to portfolio"}
                        </button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white">
                  {user ? "View in portfolio" : "Sign in to track"} <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button className="rounded-full border border-border-strong bg-card px-5 py-3 text-sm font-semibold text-fg-primary hover:bg-surface-sunken">
                Watchlist
              </button>
            </div>
            </div>
          </div>

          {/* Chart card */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[22px] font-medium text-fg-primary">Price</h2>
              <div className="flex gap-1 rounded-full bg-surface-sunken p-1">
                {(["1D", "6M", "YTD", "1Y", "5Y"] as TimePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 font-cap text-[13px]",
                      period === p ? "bg-card font-semibold text-fg-primary shadow-sm" : "text-fg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px] w-full">
              {marketLoading && priceData.length === 0 ? (
                <div className="flex h-full items-center justify-center font-cap text-sm text-fg-muted">Loading chart…</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceData}>
                  <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px" }}
                    labelFormatter={() => ""}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
                  />
                  <Line type="monotone" dataKey="price" stroke={up ? "hsl(var(--accent-deep))" : "hsl(var(--negative))"} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="h-px w-full bg-border-subtle" />
            <div className="flex flex-wrap justify-between gap-4">
              {[
                { l: "Open", v: formatCurrency(toSafeNumber(quoteData?.open)) },
                { l: "Day high", v: formatCurrency(toSafeNumber(quoteData?.high)) },
                { l: "Day low", v: formatCurrency(toSafeNumber(quoteData?.low)) },
                { l: "52w high", v: formatCurrency(yearRange.high) },
                { l: "52w low", v: formatCurrency(yearRange.low) },
                { l: "Mkt cap", v: formatMarketCap(quoteData?.market_cap ?? null) },
              ].map((s) => (
                <div key={s.l} className="flex flex-col gap-1">
                  <span className="font-cap text-xs text-fg-muted">{s.l}</span>
                  <span className="text-sm font-semibold text-fg-primary">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="my-7 h-px w-full bg-border-strong" />

        {/* Study: fundamentals + drivers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_430px]">
          <div className="rounded-2xl border border-border-subtle bg-card p-7">
            <h3 className="font-serif text-[22px] font-medium text-fg-primary">Market snapshot</h3>
            <p className="font-cap text-xs text-fg-muted">Live quote · {quoteData?.as_of_date ?? "—"}</p>
            <div className="mt-5 grid grid-cols-[1fr_120px_90px_80px] gap-5 border-b border-border-strong pb-2.5 font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              <span>Metric</span><span>Value</span><span>Trend</span><span>Change</span>
            </div>
            {fundamentals.map((f) => (
              <div key={f.label} className="grid grid-cols-[1fr_120px_90px_80px] items-center gap-5 border-b border-border-subtle py-3 last:border-b-0">
                <span className="text-sm text-fg-secondary">{f.label}</span>
                <span className="text-sm font-semibold text-fg-primary">{f.value}</span>
                <Sparkline up={f.up} />
                <span className={cn("text-sm font-medium", f.up ? "text-positive" : "text-negative")}>{f.delta}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card p-7">
            <div>
              <h3 className="font-serif text-[22px] font-medium text-fg-primary">What's driving the score</h3>
              <p className="font-cap text-xs text-fg-muted">Weighted factors</p>
            </div>
            <div className="flex flex-col gap-3.5">
              {[
                { l: "Momentum", v: 84 },
                { l: "Balance sheet", v: 78 },
                { l: "Valuation", v: 52 },
                { l: "Sentiment", v: 71 },
              ].map((d) => (
                <div key={d.l} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-fg-secondary">{d.l}</span>
                    <span className="font-semibold text-fg-primary">{d.v}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className={cn("h-2 rounded-full", d.v >= 70 ? "bg-gold-deep" : "bg-border-strong")} style={{ width: `${d.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto h-px w-full bg-border-subtle" />
            <p className="font-cap text-[11px] leading-relaxed text-fg-muted">
              Scores blend price momentum, fundamental quality, valuation vs history, and news sentiment. For research, not investment advice.
            </p>
          </div>
        </div>

        <div className="my-7 h-px w-full bg-border-strong" />

        {/* AI card */}
        <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-md bg-ink text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-medium text-fg-primary">Tradlyte AI analyst</h3>
              <p className="font-cap text-xs text-fg-muted">Grounded in your portfolio &amp; purpose</p>
            </div>
          </div>
          <div className="max-w-[680px] rounded-2xl rounded-tl-sm bg-surface-sunken px-[18px] py-4 text-[15px] leading-relaxed text-fg-secondary">
            {!user ? (
              <>Sign in to get a TradLyte AI read on {sym}.</>
            ) : initialAnalysisLoading ? (
              <span className="inline-flex items-center gap-2 font-cap text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading {sym}…
              </span>
            ) : (
              initialAnalysis ??
              `${sym} scores ${score}/100 — a ${scoreLabel}. Ask a question below for a personalized read.`
            )}
          </div>
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[680px] rounded-2xl px-[18px] py-4 text-[15px] leading-relaxed",
                m.role === "user"
                  ? "ml-auto rounded-tr-sm bg-ink text-white"
                  : "rounded-tl-sm bg-surface-sunken text-fg-secondary",
              )}
            >
              {m.text}
            </div>
          ))}
          {chatThinking && (
            <div className="max-w-[680px] rounded-2xl rounded-tl-sm bg-surface-sunken px-[18px] py-4 text-[15px] text-fg-muted">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2.5">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => setChatInput(q)}
                className="rounded-full border border-border-strong bg-card px-3.5 py-2 font-cap text-[13px] text-fg-secondary hover:bg-surface-sunken"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border-strong bg-surface-primary py-1.5 pl-5 pr-1.5">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask anything about ${sym}…`}
              className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-muted"
            />
            <button
              onClick={sendMessage}
              disabled={chatThinking || !chatInput.trim()}
              className="flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>

        <div className="my-7 h-px w-full bg-border-strong" />

        {/* News */}
        <div className="rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-medium text-fg-primary">Latest news</h3>
            <span className="font-cap text-[11px] text-fg-muted">Today</span>
          </div>
          <div className="mt-4 flex flex-col">
            {newsLoading && news.length === 0 ? (
              <p className="py-4 font-cap text-sm text-fg-muted">Loading news…</p>
            ) : news.length === 0 ? (
              <p className="py-4 font-cap text-sm text-fg-muted">No recent news for {sym}.</p>
            ) : (
            news.map((n, i) => (
              <a
                key={i}
                href={n.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("group flex flex-col gap-2 py-4", i < news.length - 1 && "border-b border-border-subtle")}
              >
                <span className="text-sm font-medium leading-snug text-fg-primary group-hover:text-gold-deep">{n.title}</span>
                <span className="flex items-center gap-2 font-cap text-[11px] text-fg-muted">
                  {n.source} · {n.time} <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            ))
            )}
          </div>
        </div>

        <p className="mx-auto mt-9 max-w-3xl border-t border-border-strong pt-9 text-center font-cap text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          Returns indexed to start of period · trends shown as eight-quarter sparklines · for research, not investment advice
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default StockDetail;
