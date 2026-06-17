import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Star, Loader2, X, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { listWatchlist, removeFromWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { fetchMarketQuote, toSafeNumber, type MarketQuoteItem } from "@/lib/marketApi";

const Watchlist = () => {
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuoteItem | null>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listWatchlist(user.id);
      setItems(list);
      const entries = await Promise.all(
        list.map(async (it) => {
          try {
            return [it.symbol, await fetchMarketQuote(it.symbol)] as const;
          } catch {
            return [it.symbol, null] as const;
          }
        }),
      );
      setQuotes(Object.fromEntries(entries));
    } catch (e) {
      console.error("Failed to load watchlist:", e);
      toast.error("Could not load your watchlist.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (symbol: string) => {
    if (!user) return;
    setItems((l) => l.filter((x) => x.symbol !== symbol)); // optimistic
    try {
      await removeFromWatchlist(user.id, symbol);
      toast.success(`Removed ${symbol} from watchlist`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
      load();
    }
  };

  if (authLoading || (loading && items.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <span className="inline-flex items-center gap-2 font-cap text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your watchlist…
          </span>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Watchlist</p>
            <h1 className="mt-3 font-serif text-[38px] font-medium leading-tight text-fg-primary">Names you're watching</h1>
            <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-fg-secondary">
              Track stocks before they enter your portfolio. Open any to analyze it, or star it from a stock's page to add it here.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink"
          >
            <Search className="h-4 w-4 text-gold-deep" /> Find a stock
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border-strong bg-card px-8 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken">
              <Star className="h-5 w-5 text-gold-deep" />
            </span>
            <p className="mt-4 font-serif text-2xl text-fg-primary">Your watchlist is empty</p>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-secondary">
              Open any stock and tap “Watchlist” to start tracking it here.
            </p>
            <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
              Explore stocks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-2xl border border-border-subtle bg-card">
            {items.map((it) => {
              const q = quotes[it.symbol];
              const price = toSafeNumber(q?.close);
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-4 border-b border-border-subtle px-6 py-4 last:border-b-0"
                >
                  <button
                    onClick={() => navigate(`/stock/${it.symbol}`)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-sunken font-serif text-base font-semibold text-gold-deep">
                      {it.symbol[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fg-primary">{it.symbol}</div>
                      <div className="truncate font-cap text-[11px] text-fg-muted">{q?.name ?? "—"}</div>
                    </div>
                    <span className="text-sm font-medium text-fg-primary">
                      {price != null ? `$${price.toFixed(2)}` : "—"}
                    </span>
                  </button>
                  <button
                    onClick={() => remove(it.symbol)}
                    aria-label={`Remove ${it.symbol} from watchlist`}
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border-subtle text-fg-muted",
                      "transition-colors hover:border-negative/40 hover:text-negative",
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Watchlist;
