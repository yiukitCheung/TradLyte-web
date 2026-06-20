import { useFinancialVault } from "@/hooks/useFinancialVault";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import VaultSetup from "./VaultSetup";
import VaultUnlock from "./VaultUnlock";
import FinancialWorkspace from "./FinancialWorkspace";

/** Routes between the vault's states: loading / error / setup / unlock / workspace. */
export default function FinancialHealthTab() {
  const { status, error, reload } = useFinancialVault();

  if (status === "loading") {
    // Layout-shaped skeleton scaffold (title + two summary cards) instead of a
    // bare spinner on a blank panel — mirrors the mobile vault loading state.
    return (
      <div className="space-y-5">
        <Skeleton className="h-3.5 w-1/2" />
        <div className="space-y-3 rounded-2xl border border-border-subtle bg-card p-6">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-7 w-3/5" />
        </div>
        <div className="space-y-3 rounded-2xl border border-border-subtle bg-card p-6">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-7 w-1/2" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-negative/40 bg-negative-soft p-6 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-negative" />
        <p className="mt-3 text-sm text-negative">{error ?? "Couldn't load your financial vault."}</p>
        <button onClick={() => void reload()} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }

  if (status === "absent") return <VaultSetup />;
  if (status === "locked") return <VaultUnlock />;
  return <FinancialWorkspace />;
}
