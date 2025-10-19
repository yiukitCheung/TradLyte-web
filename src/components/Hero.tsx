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
    <section className="relative py-24 md:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.12),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.08),transparent_50%)] -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            
            {/* Left: Purpose & Mission */}
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Purpose-Driven Wealth</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-[1.1]">
                  Build Wealth with{" "}
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Purpose
                  </span>
                  {" "}&{" "}
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Clarity
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                  {user 
                    ? "Welcome back! Track your journey, design strategies, and align your wealth with your values."
                    : "Stop chasing money. Start discovering meaning. Design strategies, track goals, and reflect on your journey."}
                </p>
              </div>
              
              {!user && (
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Link to="/auth">
                    <Button size="lg" className="group shadow-elegant">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <a href="#strategy-builder">
                    <Button size="lg" variant="outline" className="border-2">
                      Try Strategy Builder
                    </Button>
                  </a>
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <span>Bank-level security</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span>Privacy-first</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span>10K+ Active users</span>
                </div>
              </div>
            </div>

            {/* Right: Stock Search */}
            <div className="space-y-8 animate-fade-in lg:pl-8">
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 shadow-card backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl -z-10" />
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Smart Analysis</span>
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
                      Discover Stocks That{" "}
                      <span className="bg-gradient-accent bg-clip-text text-transparent">
                        Align With You
                      </span>
                    </h2>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Personalized recommendations based on your strategy, market correlations, and key fundamentals.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <form onSubmit={handleSearch} className="relative">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        type="text"
                        placeholder="Enter stock symbol (e.g., AAPL, TSLA)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 pl-12 pr-24 bg-background/50 border-2 border-border/50 focus:border-primary focus:bg-background transition-all"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                      >
                        Analyze
                        <TrendingUp className="ml-1.5 h-4 w-4" />
                      </Button>
                    </div>
                  </form>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/30 hover-scale">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xs text-foreground">Strategy</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Based Scores</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/30 hover-scale">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xs text-foreground">Market</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Correlations</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/30 hover-scale">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xs text-foreground">Key</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Fundamentals</p>
                      </div>
                    </div>
                  </div>
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
