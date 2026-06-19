import { useState } from "react";
import { Home, Car, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { computeMortgage, type LoanResult } from "@/lib/loanCalc";
import { newId } from "@/lib/financialData";
import { formatFundedDate, type PlannedPurchase } from "@/lib/financialProjection";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const fieldCls =
  "w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** "YYYY-MM" a given number of months from now, for the month picker default. */
function monthInputValue(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function NumField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-fg-muted">{prefix}</span>}
        <input
          type="number"
          min="0"
          step={step}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={fieldCls}
        />
        {suffix && <span className="text-sm text-fg-muted">{suffix}</span>}
      </div>
    </label>
  );
}

function MonthField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">{label}</span>
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
    </label>
  );
}

function Result({ result, downPayment }: { result: LoanResult; downPayment: number }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border-subtle bg-surface-sunken p-4 text-center">
      <Stat label="Down payment" value={money(downPayment)} />
      <Stat label="Monthly payment" value={money(result.monthlyPayment)} emphasis />
      <Stat label="Total interest" value={money(result.totalInterest)} />
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="font-cap text-[10px] uppercase tracking-[0.08em] text-fg-muted">{label}</p>
      <p className={emphasis ? "mt-1 font-serif text-xl font-medium text-fg-primary" : "mt-1 text-sm font-medium text-fg-secondary"}>
        {value}
      </p>
    </div>
  );
}

/** Plan future house/car purchases. Each produces a PlannedPurchase that the
 * projection chart simulates (down-payment dip + loan payment afterward). */
export default function LoanCalculators({
  purchases,
  onAddPurchase,
  onRemovePurchase,
}: {
  purchases: PlannedPurchase[];
  onAddPurchase: (p: PlannedPurchase) => void;
  onRemovePurchase: (id: string) => void;
}) {
  // Mortgage
  const [price, setPrice] = useState(0);
  const [down, setDown] = useState(0);
  const [mRate, setMRate] = useState(6.5);
  const [mYears, setMYears] = useState(30);
  const [mWhen, setMWhen] = useState(monthInputValue(24));
  const mortgage = computeMortgage(price, down, mRate, mYears);

  // Car
  const [carPrice, setCarPrice] = useState(0);
  const [carDown, setCarDown] = useState(0);
  const [cRate, setCRate] = useState(7);
  const [cYears, setCYears] = useState(5);
  const [cWhen, setCWhen] = useState(monthInputValue(12));
  const car = computeMortgage(carPrice, carDown, cRate, cYears);

  const addPurchase = (
    kind: "house" | "car",
    label: string,
    when: string,
    downPayment: number,
    result: LoanResult,
  ) => {
    if (!when) return toast.error("Pick when you plan to buy");
    if (result.monthlyPayment <= 0 && downPayment <= 0) return toast.error("Enter a price and down payment first");
    onAddPurchase({
      id: newId(),
      kind,
      label,
      targetDate: `${when}-01`,
      downPayment: Math.round(downPayment),
      monthlyPayment: Math.round(result.monthlyPayment),
      termMonths: result.termMonths,
    });
    toast.success(`Added ${label} to your plan`);
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-6">
      <h3 className="font-serif text-xl font-medium text-fg-primary">Plan a big purchase</h3>
      <p className="mt-1 text-sm text-fg-secondary">
        Estimate the payment and pick when you'd buy — we'll show the down-payment dip and how it reshapes your savings and goal timeline.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Mortgage */}
        <div className="rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-gold-deep" />
            <span className="font-cap text-xs font-medium uppercase tracking-[0.12em] text-fg-secondary">New home</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumField label="Home price" prefix="$" value={price} onChange={setPrice} />
            <NumField label="Down payment" prefix="$" value={down} onChange={setDown} />
            <NumField label="Rate" suffix="%" step="0.01" value={mRate} onChange={setMRate} />
            <NumField label="Term" suffix="yr" value={mYears} onChange={setMYears} />
            <MonthField label="Planned purchase" value={mWhen} onChange={setMWhen} />
          </div>
          <Result result={mortgage} downPayment={down} />
          <AddBtn onClick={() => addPurchase("house", "New home", mWhen, down, mortgage)} />
        </div>

        {/* Car */}
        <div className="rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-gold-deep" />
            <span className="font-cap text-xs font-medium uppercase tracking-[0.12em] text-fg-secondary">New car</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumField label="Vehicle price" prefix="$" value={carPrice} onChange={setCarPrice} />
            <NumField label="Down payment" prefix="$" value={carDown} onChange={setCarDown} />
            <NumField label="Rate" suffix="%" step="0.01" value={cRate} onChange={setCRate} />
            <NumField label="Term" suffix="yr" value={cYears} onChange={setCYears} />
            <MonthField label="Planned purchase" value={cWhen} onChange={setCWhen} />
          </div>
          <Result result={car} downPayment={carDown} />
          <AddBtn onClick={() => addPurchase("car", "New car", cWhen, carDown, car)} />
        </div>
      </div>

      {/* Planned purchases */}
      {purchases.length > 0 && (
        <div className="mt-5 border-t border-border-subtle pt-4">
          <p className="font-cap text-[11px] uppercase tracking-[0.12em] text-fg-muted">Your plan</p>
          <ul className="mt-3 space-y-2">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-sunken px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-fg-primary">
                  {p.kind === "house" ? <Home className="h-4 w-4 text-gold-deep" /> : <Car className="h-4 w-4 text-gold-deep" />}
                  {p.label}
                </span>
                <span className="flex items-center gap-3 text-fg-secondary">
                  <span className="font-cap text-xs">{formatFundedDate(new Date(p.targetDate))}</span>
                  <span className="font-cap text-xs">{money(p.downPayment)} down</span>
                  <span className="font-cap text-xs">{money(p.monthlyPayment)}/mo</span>
                  <button
                    type="button"
                    onClick={() => onRemovePurchase(p.id)}
                    aria-label={`Remove ${p.label}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white"
    >
      <CalendarPlus className="h-4 w-4" /> Add to my plan
    </button>
  );
}
