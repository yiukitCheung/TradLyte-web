import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display text-primary">TradLyte</span>
        </Link>
        
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/strategy-builder" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Strategy Builder
            </Link>
            <Link to="/goals" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Goals
            </Link>
            <a href="#journal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Journal
            </a>
          </nav>
        )}

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
