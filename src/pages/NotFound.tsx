import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative mb-2 h-[180px]">
          <span className="font-serif text-[140px] font-medium leading-none text-gold opacity-90 md:text-[170px]">404</span>
          <span className="absolute right-7 top-9 h-3.5 w-3.5 rounded-full bg-ink" />
        </div>
        <p className="font-cap text-sm uppercase tracking-[0.14em] text-gold-deep">Page not found</p>
        <h1 className="mt-4 font-serif text-[36px] font-medium text-fg-primary md:text-[46px]">
          This page wandered off.
        </h1>
        <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-fg-secondary">
          The page you're looking for may have moved or never existed. Let's get you back to what
          matters — your purpose and your portfolio.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link to="/" className="flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90">
            <ArrowLeft className="h-[17px] w-[17px]" /> Return home
          </Link>
          <Link to="/dashboard" className="rounded-full border border-border-strong bg-card px-6 py-3.5 text-[15px] font-medium text-fg-secondary hover:bg-surface-sunken">
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
