import { useState } from "react";
import { useFinancialVault } from "@/hooks/useFinancialVault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Shown when a vault exists but isn't unlocked this session (e.g. after a refresh). */
export default function VaultUnlock() {
  const { unlockWithPassword, unlockWithRecovery } = useFinancialVault();
  const [mode, setMode] = useState<"password" | "recovery">("password");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      if (mode === "password") await unlockWithPassword(value);
      else await unlockWithRecovery(value);
      setValue("");
    } catch {
      toast.error(
        mode === "password"
          ? "Couldn't unlock — check your password, or use your recovery code."
          : "That recovery code didn't work. Check for typos.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border-subtle bg-card p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken">
        <Lock className="h-5 w-5 text-gold-deep" />
      </span>
      <h2 className="mt-4 font-serif text-xl font-medium text-fg-primary">Unlock your financial data</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-fg-secondary">
        {mode === "password"
          ? "Enter your account password to decrypt your numbers on this device."
          : "Enter your recovery code to regain access."}
      </p>

      <div className="mx-auto mt-5 max-w-xs space-y-2 text-left">
        <Label htmlFor="unlock-input">{mode === "password" ? "Password" : "Recovery code"}</Label>
        <Input
          id="unlock-input"
          type={mode === "password" ? "password" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={mode === "password" ? "Your login password" : "XXXX-XXXX-XXXX…"}
          autoComplete={mode === "password" ? "current-password" : "off"}
        />
      </div>

      <Button onClick={submit} disabled={busy} className="mt-5">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Unlock
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "password" ? "recovery" : "password"));
          setValue("");
        }}
        className="mt-4 block w-full font-cap text-xs text-fg-muted underline-offset-2 hover:text-fg-secondary hover:underline"
      >
        {mode === "password" ? "Use my recovery code instead" : "Back to password"}
      </button>
    </div>
  );
}
