import { useState } from "react";
import { useFinancialVault } from "@/hooks/useFinancialVault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import RecoveryCodeModal from "./RecoveryCodeModal";

/** First-run setup card: confirm password → create the encrypted vault → show recovery code. */
export default function VaultSetup() {
  const { setup, reload } = useFinancialVault();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!password) {
      toast.error("Enter your account password to set up your vault");
      return;
    }
    setBusy(true);
    try {
      const code = await setup(password);
      setPassword("");
      setRecoveryCode(code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set up your vault");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border-subtle bg-card p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken">
        <EyeOff className="h-6 w-6 text-gold-deep" />
      </span>
      <h2 className="mt-5 font-serif text-2xl font-medium text-fg-primary">Your private financial space</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-secondary">
        Map your income and expenses to see your real monthly cash flow — and how fast it funds your
        goals. Everything here is <strong>encrypted on your device</strong> before it's saved. We
        store only scrambled text and can never read your numbers.
      </p>

      <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
        <Label htmlFor="vault-pw">Confirm your account password</Label>
        <Input
          id="vault-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Your login password"
          autoComplete="current-password"
        />
        <p className="font-cap text-[11px] text-fg-muted">
          Your password unlocks the data each time you sign in — nothing extra to remember.
        </p>
      </div>

      <Button onClick={handleCreate} disabled={busy} className="mt-5">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
        Create my private vault
      </Button>

      {recoveryCode && (
        <RecoveryCodeModal
          code={recoveryCode}
          open={!!recoveryCode}
          onClose={() => {
            setRecoveryCode(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
