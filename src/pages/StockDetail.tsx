import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TrendingUp, TrendingDown, Plus, Check, Loader2, Newspaper, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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

  // Generate price chart data (placeholder)
  const generatePriceData = () => {
    const data = [];
    let price = 165;
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      price = price + (Math.random() - 0.48) * 3;
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: parseFloat(price.toFixed(2)),
      });
    }
    return data;
  };

  const priceData = generatePriceData();

  // Placeholder data - will be replaced by backend
  const stockData = {
    symbol: symbol || "AAPL",
    name: getStockName(symbol || "AAPL"),
    price: 178.45,
    change: 2.34,
    changePercent: 1.33,
    recommendationScore: user ? 87 : 72,
    strategyName: user ? "Growth & Value Mix" : "Default Strategy",
    correlatedIndices: [
      { name: "S&P 500", correlation: 0.92, change: 1.2, price: "$5,234.18" },
      { name: "NASDAQ", correlation: 0.89, change: 1.5, price: "$16,742.39" },
      { name: "Technology", correlation: 0.85, change: 2.1, price: "$3,892.45" },
      { name: "Crude Oil (WTI)", correlation: 0.42, change: -0.8, price: "$78.24" },
      { name: "Gold", correlation: -0.35, change: 0.4, price: "$2,048.60" },
    ],
    news: [
      {
        title: `${symbol || "AAPL"} Reports Strong Q4 Earnings, Beats Expectations`,
        source: "Reuters",
        time: "2 hours ago",
        summary: "The company reported quarterly earnings that exceeded analyst expectations, driven by strong demand in key markets.",
      },
      {
        title: `Analysts Upgrade ${symbol || "AAPL"} Stock Following Product Launch`,
        source: "Bloomberg",
        time: "5 hours ago",
        summary: "Several major investment banks have upgraded their price targets following the successful launch of new products.",
      },
      {
        title: `${symbol || "AAPL"} Expands AI Capabilities with New Partnership`,
        source: "CNBC",
        time: "1 day ago",
        summary: "The tech giant announced a strategic partnership to enhance its artificial intelligence offerings across its product lineup.",
      },
      {
        title: `Market Watch: ${symbol || "AAPL"} Trading Volume Surges`,
        source: "MarketWatch",
        time: "1 day ago",
        summary: "Trading activity has increased significantly as investors react to recent market developments and sector rotation.",
      },
    ],
    fundamentals: {
      marketCap: "2.8T",
      peRatio: 29.5,
      dividendYield: "0.52%",
      week52High: 199.62,
      week52Low: 164.08,
      volume: "52.3M",
      avgVolume: "56.2M",
      eps: 6.05,
      revenue: "383.3B",
      profitMargin: "25.3%",
    },
  };

  // Check if stock is already in user's portfolio
  useEffect(() => {
    const checkPortfolio = async () => {
      if (!user || !symbol) {
        setPortfolioLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_portfolio')
          .select('id')
          .eq('user_id', user.id)
          .eq('asset_name', symbol)
          .maybeSingle();

        if (error) throw error;
        setIsInPortfolio(!!data);
      } catch (error) {
        console.error('Error checking portfolio:', error);
      } finally {
        setPortfolioLoading(false);
      }
    };

    if (!authLoading) {
      checkPortfolio();
    }
  }, [user, symbol, authLoading]);

  const handleAddToPortfolio = async () => {
    if (!user || !symbol) return;

    const price = parseFloat(buyInPrice);
    const qty = parseFloat(quantity);

    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid buy-in price");
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsAdding(true);

    try {
      const { error } = await supabase
        .from('user_portfolio')
        .insert({
          user_id: user.id,
          asset_name: symbol,
          asset_type: 'stock',
          purchase_price: price,
          current_price: stockData.price,
          quantity: qty,
        });

      if (error) throw error;

      setIsInPortfolio(true);
      setAddDialogOpen(false);
      toast.success(`${symbol} added to your portfolio!`);
      setBuyInPrice("");
      setQuantity("1");
    } catch (error: any) {
      console.error('Error adding to portfolio:', error);
      toast.error(error.message || "Failed to add to portfolio");
    } finally {
      setIsAdding(false);
    }
  };

  function getStockName(sym: string): string {
    const names: Record<string, string> = {
      AAPL: "Apple Inc.",
      GOOGL: "Alphabet Inc.",
      MSFT: "Microsoft Corporation",
      AMZN: "Amazon.com Inc.",
      TSLA: "Tesla Inc.",
      META: "Meta Platforms Inc.",
      NVDA: "NVIDIA Corporation",
    };
    return names[sym] || `${sym} Inc.`;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-accent";
    return "text-muted-foreground";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong Buy";
    if (score >= 60) return "Buy";
    if (score >= 40) return "Hold";
    return "Sell";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Stock Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-display font-bold text-foreground">
                  {stockData.symbol}
                </h1>
                <Badge variant="secondary" className="text-sm">
                  {stockData.name}
                </Badge>
              </div>
              
              {/* Add to Portfolio Button */}
              {user && !authLoading && (
                portfolioLoading ? (
                  <Button disabled variant="outline">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : isInPortfolio ? (
                  <Button variant="outline" disabled className="text-primary border-primary">
                    <Check className="mr-2 h-4 w-4" />
                    In Portfolio
                  </Button>
                ) : (
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default">
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Portfolio
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add {symbol} to Portfolio</DialogTitle>
                        <DialogDescription>
                          Enter your buy-in price and quantity to track this stock in your portfolio.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="buyInPrice">Buy-in Price ($)</Label>
                          <Input
                            id="buyInPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={stockData.price.toString()}
                            value={buyInPrice}
                            onChange={(e) => setBuyInPrice(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Current price: ${stockData.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity (shares)</Label>
                          <Input
                            id="quantity"
                            type="number"
                            step="1"
                            min="1"
                            placeholder="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddToPortfolio} disabled={isAdding}>
                          {isAdding ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add to Portfolio"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )
              )}
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-foreground">
                ${stockData.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center gap-1 text-lg font-semibold ${
                  stockData.change >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {stockData.change >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {stockData.change >= 0 ? "+" : ""}
                {stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* PRIMARY SECTION: News & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top News */}
            <Card className="shadow-card border-border/50 animate-fade-in bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary" />
                  Top News
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stockData.news.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Price Chart */}
            <Card className="shadow-card border-border/50 animate-fade-in bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Price Chart (30 Days)</span>
                  <Badge variant={stockData.change >= 0 ? "default" : "destructive"} className="text-sm">
                    {stockData.change >= 0 ? "+" : ""}{stockData.changePercent.toFixed(2)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation Score */}
          <Card className="mb-6 shadow-card border-border/50 animate-fade-in bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recommendation Score</span>
                {authLoading ? (
                  <Badge variant="outline" className="text-sm">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Loading...
                  </Badge>
                ) : user ? (
                  <Badge variant="outline" className="text-sm">
                    Based on: {stockData.strategyName}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm">
                    Sign in for personalized scores
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-5xl font-bold ${getScoreColor(stockData.recommendationScore)}`}>
                    {stockData.recommendationScore}
                  </span>
                  <span className={`text-2xl font-semibold ${getScoreColor(stockData.recommendationScore)}`}>
                    {getScoreLabel(stockData.recommendationScore)}
                  </span>
                </div>
                <Progress value={stockData.recommendationScore} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {user
                    ? "This score is calculated based on your personal investment strategy and risk preferences."
                    : "This is a default recommendation score. Sign in to get personalized recommendations based on your strategy."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SECONDARY SECTION: Correlated Indices & Fundamentals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Correlated Indices */}
            <Card className="shadow-card border-border/50 animate-fade-in">
              <CardHeader>
                <CardTitle>Correlated Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockData.correlatedIndices.map((index) => (
                    <div
                      key={index.name}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-foreground text-sm">{index.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {index.price} · Correlation: {index.correlation > 0 ? "+" : ""}{(index.correlation * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.abs(index.correlation) * 100} 
                          className={`w-16 h-2 ${index.correlation < 0 ? '[&>div]:bg-destructive' : ''}`}
                        />
                        <span
                          className={`text-sm font-semibold w-16 text-right ${
                            index.change >= 0 ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {index.change >= 0 ? "+" : ""}
                          {index.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fundamentals */}
            <Card className="shadow-card border-border/50 animate-fade-in">
              <CardHeader>
                <CardTitle>Key Fundamentals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                    <div className="text-sm font-semibold text-foreground">
                      ${stockData.fundamentals.marketCap}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">P/E Ratio</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stockData.fundamentals.peRatio}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Dividend Yield</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stockData.fundamentals.dividendYield}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">EPS</div>
                    <div className="text-sm font-semibold text-foreground">
                      ${stockData.fundamentals.eps}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">52W High</div>
                    <div className="text-sm font-semibold text-foreground">
                      ${stockData.fundamentals.week52High}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">52W Low</div>
                    <div className="text-sm font-semibold text-foreground">
                      ${stockData.fundamentals.week52Low}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Volume</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stockData.fundamentals.volume}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Profit Margin</div>
                    <div className="text-sm font-semibold text-foreground">
                      {stockData.fundamentals.profitMargin}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StockDetail;
