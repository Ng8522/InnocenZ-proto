/** PR medical (MC) / personal-leave requests — reviewed and released by the agency. */

export type PrLeaveKind = "mc" | "leave";
export type PrLeaveStatus = "pending" | "approved" | "rejected";

export interface PrLeaveRequest {
  id: string;
  prId: string;
  prName: string;
  outlet: string;
  dateIso: string;
  dateLabel: string;
  shift: string;
  rosterSlotId?: string;
  kind: PrLeaveKind;
  reason: string;
  status: PrLeaveStatus;
  at: string;
  respondedAt?: string;
  /** Nearest available PR the agency/outlet should call to backfill an approved MC. */
  backfillPrName?: string;
}

export const PR_LEAVE_KIND_LABEL: Record<PrLeaveKind, string> = {
  mc: "Medical (MC)",
  leave: "Personal leave",
};

export const PR_LEAVE_KIND_SHORT: Record<PrLeaveKind, string> = {
  mc: "MC",
  leave: "Leave",
};

export function pendingPrLeaveRequests(list: PrLeaveRequest[]): PrLeaveRequest[] {
  return list.filter((r) => r.status === "pending");
}

export function prLeaveRequestsForPr(list: PrLeaveRequest[], prId: string): PrLeaveRequest[] {
  return list.filter((r) => r.prId === prId);
}

/** Is this PR already on a pending/approved MC/leave for the given date + outlet? */
export function prHasActiveLeaveForSlot(
  list: PrLeaveRequest[],
  prId: string,
  dateIso: string,
  outlet: string,
): boolean {
  return list.some(
    (r) =>
      r.prId === prId &&
      r.dateIso === dateIso &&
      r.outlet === outlet &&
      (r.status === "pending" || r.status === "approved"),
  );
}

/**
 * Demo backfill picker — "nearest available PR" the agency/outlet should call to
 * cover an approved MC. Prefers an active PR in the same area, excluding the one
 * going on leave and anyone flagged suspended/detached.
 */
export function pickBackfillPrName(
  candidates: {
    id: string;
    name: string;
    place?: string;
    suspended?: boolean;
    detached?: boolean;
  }[],
  opts: { excludePrId: string; preferPlace?: string },
): string | undefined {
  const available = candidates.filter(
    (c) => c.id !== opts.excludePrId && !c.suspended && !c.detached,
  );
  if (available.length === 0) return undefined;
  const sameArea = opts.preferPlace
    ? available.find((c) => c.place && c.place === opts.preferPlace)
    : undefined;
  return (sameArea ?? available[0]).name;
}
