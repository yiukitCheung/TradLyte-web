import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display text-primary">TradLyte</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {isHomePage ? (
            <>
              <a href="#market" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Market
              </a>
              <a href="#dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </a>
              <a href="#strategy-builder" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Strategy Builder
              </a>
              <a href="#goals" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Goals
              </a>
              <a href="#journal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Journal
              </a>
            </>
          ) : user && (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/strategy-builder" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Strategy Builder
              </Link>
              <Link to="/goals" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Goals
              </Link>
              <Link to="/journal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Journal
              </Link>
            </>
          )}
        </nav>

        {user ? (
          <Button onClick={() => signOut()} variant="outline" size="sm" className="hidden md:flex">
            Sign Out
          </Button>
        ) : (
          <Link to="/auth">
            <Button variant="default" size="sm" className="hidden md:flex">
              Get Started
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
