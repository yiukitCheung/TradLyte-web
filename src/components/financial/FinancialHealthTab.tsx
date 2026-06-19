import { useFinancialVault } from "@/hooks/useFinancialVault";
import { Loader2, AlertCircle } from "lucide-react";
import VaultSetup from "./VaultSetup";
import VaultUnlock from "./VaultUnlock";
import FinancialWorkspace from "./FinancialWorkspace";

/** Routes between the vault's states: loading / error / setup / unlock / workspace. */
export default function FinancialHealthTab() {
  const { status, error, reload } = useFinancialVault();

  if (status === "loading") {
    return (
      <div className="flex h-48 items-center justify-center text-fg-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
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
