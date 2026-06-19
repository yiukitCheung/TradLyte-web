import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Wordmark = () => (
  <Link to="/" className="flex items-center gap-2.5">
    <span className="h-[22px] w-[22px] rounded-full bg-ink" aria-hidden />
    <span className="font-serif text-[22px] font-semibold leading-none text-fg-primary">
      TradLyte
    </span>
  </Link>
);

const navLinkClass =
  "text-[15px] font-medium text-fg-secondary transition-colors hover:text-fg-primary";

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Logged-out marketing nav vs. logged-in app nav.
  const marketingNav = [
    { label: "Strategy Lab", to: user ? "/strategy-builder" : "/auth" },
    { label: "Goals", to: user ? "/goals" : "/auth" },
    { label: "Journal", to: user ? "/journal" : "/auth" },
    { label: "About", to: "/about" },
  ];
  const appNav = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Strategy Lab", to: "/strategy-builder" },
    { label: "Goals", to: "/goals" },
    { label: "Journal", to: "/journal" },
    { label: "About", to: "/about" },
  ];
  const navItems = user ? appNav : marketingNav;
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 md:px-12">
        <div className="flex flex-1 items-center">
          <Wordmark />
        </div>

        <nav className="hidden items-center justify-center gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                navLinkClass,
                location.pathname === item.to && "text-fg-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-fg-primary md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full border border-border-subtle bg-surface-sunken py-1.5 pl-1.5 pr-3 outline-none transition-colors hover:bg-surface-sunken/70 focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gold text-[11px] font-semibold text-white">
                  {initials}
                </span>
                <span className="text-sm font-medium text-fg-primary">{fullName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notifications">Notifications</Link>
                </DropdownMenuItem>
                {isAdminEmail(user.email) && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth" className={cn(navLinkClass, "hidden sm:inline")}>
                Sign in
              </Link>
              <Link
                to="/auth"
                className="rounded-full bg-ink px-[22px] py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border-subtle bg-card px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-surface-sunken text-fg-primary"
                    : "text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
