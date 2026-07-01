import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { getBatchRun, updateBatchDdCap, type SavedBatchRunDetail } from "@/lib/savedBatches";
import BatchResults from "@/components/strategy-builder/BatchResults";

const BatchAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();

  const [run, setRun] = useState<SavedBatchRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user || !id) return;
      setLoading(true);
      try {
        const detail = await getBatchRun(id);
        if (!alive) return;
        if (!detail) {
          setNotFound(true);
        } else {
          setRun(detail);
        }
      } catch (e) {
        console.error(e);
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[820px] flex-1 px-6 py-12 md:px-12">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-4 h-[220px] w-full rounded-2xl" />
          <Skeleton className="mt-4 h-[260px] w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !run) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="font-serif text-2xl text-fg-primary">This batch isn't here</p>
          <p className="mt-2 text-[15px] text-fg-secondary">It may have been deleted, or belongs to another account.</p>
          <Link to="/strategy-lab/batch" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Start a new batch
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10 md:px-12">
        <BatchResults
          run={run}
          onDdCapChange={(pct) => { void updateBatchDdCap(run.id, pct); }}
        />
      </main>
      <Footer />
    </div>
  );
};

export default BatchAnalytics;
