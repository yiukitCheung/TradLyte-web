import { Search, TrendingUp, Target, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const StockSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/stock/${searchQuery.toUpperCase()}`);
      setSearchQuery("");
    }
  };

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Heading */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Lightbulb className="h-4 w-4" />
              <span>Smart Stock Analysis</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
              Discover Stocks That
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Align With Your Strategy
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Search any stock and get personalized recommendations based on your investment strategy, 
              market correlations, and fundamental analysis—not just the basics everyone else shows you.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Enter stock symbol (e.g., AAPL, TSLA, MSFT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-16 pl-16 pr-32 text-lg bg-card border-2 border-border/50 focus:border-primary shadow-elegant hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.3)] transition-all"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 shadow-elegant"
              >
                Analyze
                <TrendingUp className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Features */}
          <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Strategy-Based Scores</h3>
              <p className="text-sm text-muted-foreground text-center">
                Get recommendations tailored to your personal investment strategy
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Market Correlations</h3>
              <p className="text-sm text-muted-foreground text-center">
                See how stocks move with major indices and sectors
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Smart Fundamentals</h3>
              <p className="text-sm text-muted-foreground text-center">
                Key metrics that matter for your investment decisions
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StockSearch;
