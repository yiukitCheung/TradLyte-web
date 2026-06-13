import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { addUserRegret, REGRET_REASONS } from "@/lib/regretUtils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RegretSystemProps {
  stockSymbol: string;
  industry?: string;
  portfolioId?: string | null;
  alreadyMarked?: boolean;
  onRegretAdded?: () => void;
}

const RegretSystem = ({
  stockSymbol,
  industry,
  portfolioId,
  alreadyMarked = false,
  onRegretAdded,
}: RegretSystemProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sign in to log a regret");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason for this regret");
      return;
    }

    setSaving(true);
    try {
      await addUserRegret(user.id, {
        stockSymbol,
        portfolioId,
        industry,
        reason: REGRET_REASONS.find((r) => r.value === reason)?.label || reason,
        reasonCode: reason,
        notes: notes.trim() || undefined,
      });
      toast.success("Regret saved to your account. We'll remind you on similar trades.");
      setOpen(false);
      setReason("");
      setNotes("");
      onRegretAdded?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save regret";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (alreadyMarked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-negative/30 bg-negative-soft px-3 py-1.5 font-cap text-xs font-medium text-negative">
        <Check className="h-3 w-3" /> Regret logged
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <AlertTriangle className="mr-1 h-4 w-4" />
          Mark as regret
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {stockSymbol} as regret</DialogTitle>
          <DialogDescription>
            Document what went wrong. This saves to your TradLyte profile and triggers guardrails on similar trades.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Why did you regret this trade?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REGRET_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regret-notes">Additional notes (optional)</Label>
            <Textarea
              id="regret-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you learn from this experience?"
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="destructive" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save regret"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegretSystem;
