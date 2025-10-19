import { ArrowRight, Sparkles, Lock, Shield, Search, Target, TrendingUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/stock/${searchQuery.toUpperCase()}`);
      setSearchQuery("");
    }
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,hsl(var(--accent)/0.06),transparent_50%)] -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Main Grid: Purpose + Stock Search */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Side: Purpose & Mission */}
            <div className="space-y-8 animate-fade-in text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Purpose-Driven Wealth Platform</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight">
                Build Wealth with
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Purpose & Clarity
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {user 
                  ? `Welcome back! Track your financial journey, design strategies, and align your wealth with your values.`
                  : `Stop chasing money. Start discovering meaning. Design strategies, track goals, and reflect on your financial journey.`
                }
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center pt-4">
                {user ? (
                  <p className="text-lg font-medium text-foreground">
                    Explore your features below 👇
                  </p>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button size="lg" className="group shadow-elegant">
                        Start Your Journey
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <a href="#strategy-builder">
                      <Button size="lg" variant="outline">
                        Try Strategy Builder
                      </Button>
                    </a>
                  </>
                )}
              </div>
              
              <div className="pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Bank-level security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Privacy-first</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>10K+ Active users</span>
                </div>
              </div>
            </div>

            {/* Right Side: Stock Search */}
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
                  <Lightbulb className="h-4 w-4" />
                  <span>Smart Stock Analysis</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
                  Discover Stocks That
                  <span className="block bg-gradient-accent bg-clip-text text-transparent">
                    Align With Your Strategy
                  </span>
                </h2>
                
                <p className="text-base text-muted-foreground">
                  Get personalized recommendations based on your investment strategy, 
                  market correlations, and fundamentals—not just the basics.
                </p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Enter stock symbol (e.g., AAPL, TSLA)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 pl-14 pr-28 text-base bg-card border-2 border-border/50 focus:border-primary shadow-card hover:shadow-elegant transition-all"
                  />
                  <Button
                    type="submit"
                    size="default"
                    className="absolute right-2 top-1/2 -translate-y-1/2 shadow-elegant"
                  >
                    Analyze
                    <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col items-center sm:items-start gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Strategy Scores</h3>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    Tailored to your strategy
                  </p>
                </div>

                <div className="flex flex-col items-center sm:items-start gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Correlations</h3>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    Market index insights
                  </p>
                </div>

                <div className="flex flex-col items-center sm:items-start gap-2 p-4 rounded-lg bg-card/50 border border-border/50 hover-scale">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Fundamentals</h3>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    Key metrics that matter
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
