/**
 * Per-day agency review overlay for the running (current) week. Lets the PR
 * dispute a day before the PV is issued, and lets the agency verify a checked-out
 * day (which locks that day's dispute window) or resolve a raised dispute.
 *
 * Kept separate from the derived weekly-payment engine (pr-weekly-payment.ts):
 * the engine computes the base day status from checkout data, this overlay is
 * applied on top so agency actions can override it.
 */
import type { WeeklyDayStatus, WeeklyPaymentSummary } from "@/lib/pr-weekly-payment";

export type PrWeekDayReviewStatus = "pending" | "approved" | "rejected";

export interface PrWeekDayReview {
  prId: string;
  dateIso: string;
  agencyVerified: boolean;
  verifiedAt?: string;
  disputeReason?: string;
  disputeStatus?: PrWeekDayReviewStatus;
  disputeAt?: string;
  disputeResolvedAt?: string;
}

export function findWeekDayReview(
  reviews: PrWeekDayReview[],
  prId: string,
  dateIso: string,
): PrWeekDayReview | undefined {
  return reviews.find((r) => r.prId === prId && r.dateIso === dateIso);
}

export function weekDayReviewsForPr(reviews: PrWeekDayReview[], prId: string): PrWeekDayReview[] {
  return reviews.filter((r) => r.prId === prId);
}

/** Days the agency has verified — locked, the PR can no longer dispute them. */
export function lockedWeekDates(reviews: PrWeekDayReview[], prId: string): Set<string> {
  return new Set(reviews.filter((r) => r.prId === prId && r.agencyVerified).map((r) => r.dateIso));
}

/** Pending disputes across all PRs — for the agency to resolve. */
export function pendingWeekDisputes(reviews: PrWeekDayReview[]): PrWeekDayReview[] {
  return reviews.filter((r) => r.disputeStatus === "pending");
}

/** Overlay agency verify / dispute state onto a derived week summary. */
export function applyWeekDayReviews(
  summary: WeeklyPaymentSummary,
  reviews: PrWeekDayReview[],
): WeeklyPaymentSummary {
  if (reviews.length === 0) return summary;
  const byIso = new Map(reviews.map((r) => [r.dateIso, r] as const));
  const dayStatus: WeeklyDayStatus[] = summary.dayStatus.map((st, idx) => {
    const r = byIso.get(summary.columns[idx].dateIso);
    if (!r) return st;
    if (r.disputeStatus === "pending") return "disputed";
    if (r.agencyVerified) return "verified";
    return st;
  });
  return {
    ...summary,
    dayStatus,
    verifiedDayCount: dayStatus.filter((s) => s === "verified").length,
  };
}
