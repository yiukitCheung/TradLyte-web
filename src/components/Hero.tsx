import { ArrowRight, Sparkles, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const { user } = useAuth();

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,hsl(var(--accent)/0.06),transparent_50%)] -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Purpose-Driven Wealth Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground leading-tight">
            Build Wealth with
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Purpose & Clarity
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {user 
              ? `Welcome back! Track your financial journey, design strategies, and align your wealth with your values.`
              : `Stop chasing money. Start discovering meaning. Design strategies, track goals, and reflect on your financial journey.`
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
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
          
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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
      </div>
    </section>
  );
};

export default Hero;
