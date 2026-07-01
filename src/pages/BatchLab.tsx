import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BatchTestPanel from "@/components/strategy-builder/BatchTestPanel";

const BatchLab = () => {
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Batch backtest</p>
            <h1 className="mt-3 font-serif text-[38px] font-medium leading-tight text-fg-primary">Test a strategy across your list</h1>
            <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-fg-secondary">
              Run every strategy you pick against every ticker you pick, then read one clear verdict on the configuration worth deploying.
            </p>
          </div>
          <Link to="/strategy-builder" className="whitespace-nowrap font-cap text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-secondary hover:text-fg-primary">
            Single backtest →
          </Link>
        </div>
        <BatchTestPanel />
      </main>
      <Footer />
    </div>
  );
};

export default BatchLab;
