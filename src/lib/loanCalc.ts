/**
 * Loan amortization — standard fixed-rate math for the Financial Health loan
 * calculators (mortgage, car loan). Pure + DOM-free so it ports verbatim to
 * mobile. These are what-if tools; nothing here is persisted.
 */

export interface LoanResult {
  /** Amount actually financed (principal). */
  principal: number;
  /** Fixed monthly payment (principal + interest). */
  monthlyPayment: number;
  /** Sum of every payment over the full term. */
  totalPaid: number;
  /** totalPaid − principal. */
  totalInterest: number;
  termMonths: number;
}

/**
 * Standard amortizing payment: P · r / (1 − (1+r)^−n), where r is the monthly
 * rate and n the number of payments. Falls back to straight-line when the rate
 * is 0 (avoids a divide-by-zero) and clamps nonsense inputs to a safe zero.
 */
export function computeLoan(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): LoanResult {
  const p = Number.isFinite(principal) && principal > 0 ? principal : 0;
  const n = Number.isFinite(termMonths) && termMonths > 0 ? Math.round(termMonths) : 0;
  const r = Number.isFinite(annualRatePct) && annualRatePct > 0 ? annualRatePct / 100 / 12 : 0;

  if (p === 0 || n === 0) {
    return { principal: p, monthlyPayment: 0, totalPaid: 0, totalInterest: 0, termMonths: n };
  }

  const monthlyPayment = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  const totalPaid = monthlyPayment * n;

  return {
    principal: p,
    monthlyPayment,
    totalPaid,
    totalInterest: totalPaid - p,
    termMonths: n,
  };
}

/** Mortgage convenience: principal = home price − down payment. */
export function computeMortgage(
  homePrice: number,
  downPayment: number,
  annualRatePct: number,
  termYears: number,
): LoanResult {
  const principal = Math.max(0, (homePrice || 0) - (downPayment || 0));
  return computeLoan(principal, annualRatePct, (termYears || 0) * 12);
}
