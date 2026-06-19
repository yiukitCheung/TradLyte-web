import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ShieldAlert } from "lucide-react";

/**
 * Shows the one-time recovery code. This is the ONLY time it's ever visible —
 * we can't show it again because we never store it in readable form.
 */
export default function RecoveryCodeModal({
  code,
  open,
  onClose,
}: {
  code: string;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can still read/write it down */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && confirmed && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-gold-deep" /> Save your recovery code
          </DialogTitle>
          <DialogDescription>
            This is the only way back into your financial data if you forget your password. We
            <strong> cannot recover it for you</strong> — store it somewhere safe.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface-sunken px-4 py-3.5">
          <code className="select-all font-mono text-[15px] tracking-wide text-fg-primary">{code}</code>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 py-1.5 font-cap text-xs font-medium text-fg-secondary hover:bg-surface-sunken"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent-deep))]"
          />
          I've saved my recovery code somewhere safe. I understand it can't be shown again.
        </label>

        <DialogFooter>
          <Button onClick={onClose} disabled={!confirmed}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
