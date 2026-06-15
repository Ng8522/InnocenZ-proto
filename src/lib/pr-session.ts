import type { AgencyRosterSlot } from "@/lib/agency-demo";
import type { PrActiveShiftSession, PrSubRole } from "@/lib/pr-demo";
import { PR_SHIFT_OFFERS, TIED_DEMO_ROSTER_PR_ID } from "@/lib/pr-demo";
import { swapBlocksRequestingPrShift } from "@/lib/pr-features";
import { outletMatches } from "@/lib/portal-sync";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
export type PrMarketplaceApplicationState = {
  listingId: string;
  status: "pending" | "accepted" | "declined";
  applicantId?: string;
  shiftId?: string;
} | null;

export type PrCheckInMetaState = {
  late?: boolean;
  noShowRisk?: boolean;
  selfieDataUrl?: string | null;
  gpsFallback?: boolean;
};

export interface PrShiftSessionState {
  shiftAccepted: boolean;
  pendingApproval: boolean;
  acceptedShiftIndex: number | null;
  checkedIn: boolean;
  checkedOut: boolean;
  drinks: number;
  tables: number;
  outletRatingStars: number;
  prActiveShift: PrActiveShiftSession | null;
  prCheckInMeta: PrCheckInMetaState;
  prMarketplaceApplication: PrMarketplaceApplicationState;
}

export type PrSessionContext = {
  agencyRoster: AgencyRosterSlot[];
  prSwapRequests?: import("@/lib/pr-features").PrSwapRequest[];
};

export const EMPTY_PR_SHIFT_SESSION: PrShiftSessionState = {
  shiftAccepted: false,
  pendingApproval: false,
  acceptedShiftIndex: null,
  checkedIn: false,
  checkedOut: false,
  drinks: 0,
  tables: 0,
  outletRatingStars: 0,
  prActiveShift: null,
  prCheckInMeta: {},
  prMarketplaceApplication: null,
};

export function shiftIndexForOutlet(outlet: string): number {
  const idx = PR_SHIFT_OFFERS.findIndex((o) => outletMatches(o.outlet, outlet));
  return idx >= 0 ? idx : 0;
}

export function findAgencyRosterTonight(
  roster: AgencyRosterSlot[],
  prId: string,
  dateIso: string = DEFAULT_ROSTER_DATE_ISO,
): AgencyRosterSlot | undefined {
  return roster.find(
    (s) =>
      s.prId === prId &&
      s.dateIso === dateIso &&
      (s.status === "scheduled" ||
        s.status === "en-route" ||
        s.status === "on-duty" ||
        s.status === "assignment-pending"),
  );
}

/** Bootstrap tied PR shift flow from agency roster; freelancer starts empty. */
export function defaultPrShiftSessionForRole(role: PrSubRole, ctx: PrSessionContext): PrShiftSessionState {
  if (role !== "pr_tied") return { ...EMPTY_PR_SHIFT_SESSION };

  const swaps = ctx.prSwapRequests ?? [];
  if (swapBlocksRequestingPrShift(swaps, TIED_DEMO_ROSTER_PR_ID)) {
    return { ...EMPTY_PR_SHIFT_SESSION };
  }

  const slot = findAgencyRosterTonight(ctx.agencyRoster, TIED_DEMO_ROSTER_PR_ID);
  if (!slot) return { ...EMPTY_PR_SHIFT_SESSION };

  const pending = slot.status === "assignment-pending";
  const onDuty = slot.status === "on-duty" && !!slot.checkedInAt;

  return {
    shiftAccepted: !pending,
    pendingApproval: pending,
    acceptedShiftIndex: shiftIndexForOutlet(slot.outlet),
    checkedIn: onDuty,
    checkedOut: false,
    drinks: slot.floorDrinks ?? 0,
    tables: 0,
    outletRatingStars: 0,
    prActiveShift: null,
    prCheckInMeta: {},
    prMarketplaceApplication: null,
  };
}

export function extractPrShiftSession(st: {
  shiftAccepted: boolean;
  pendingApproval: boolean;
  acceptedShiftIndex: number | null;
  checkedIn: boolean;
  checkedOut: boolean;
  drinks: number;
  tables: number;
  outletRatingStars: number;
  prActiveShift: PrActiveShiftSession | null;
  prCheckInMeta: PrCheckInMetaState;
  prMarketplaceApplication: PrMarketplaceApplicationState;
}): PrShiftSessionState {
  return {
    shiftAccepted: st.shiftAccepted,
    pendingApproval: st.pendingApproval,
    acceptedShiftIndex: st.acceptedShiftIndex,
    checkedIn: st.checkedIn,
    checkedOut: st.checkedOut,
    drinks: st.drinks,
    tables: st.tables,
    outletRatingStars: st.outletRatingStars,
    prActiveShift: st.prActiveShift,
    prCheckInMeta: { ...st.prCheckInMeta },
    prMarketplaceApplication: st.prMarketplaceApplication ? { ...st.prMarketplaceApplication } : null,
  };
}

export function applyPrShiftSession(session: PrShiftSessionState): PrShiftSessionState {
  return {
    ...session,
    prCheckInMeta: { ...session.prCheckInMeta },
    prMarketplaceApplication: session.prMarketplaceApplication ? { ...session.prMarketplaceApplication } : null,
  };
}

/** Outlet-side freelancer accept — never overwrite the active tied PR session. */
export function patchFreelancerPrSession(
  st: {
    prSubRole: PrSubRole | null;
    prSessionByRole: Partial<Record<PrSubRole, PrShiftSessionState>>;
    agencyRoster: AgencyRosterSlot[];
  },
  patch: Partial<PrShiftSessionState>,
): {
  prSessionByRole: Partial<Record<PrSubRole, PrShiftSessionState>>;
} & Partial<PrShiftSessionState> {
  const base =
    st.prSessionByRole.pr_free ?? defaultPrShiftSessionForRole("pr_free", { agencyRoster: st.agencyRoster });
  const nextFree = { ...base, ...patch };
  const prSessionByRole = { ...st.prSessionByRole, pr_free: nextFree };

  if (st.prSubRole === "pr_free") {
    return { prSessionByRole, ...applyPrShiftSession(nextFree) };
  }
  return { prSessionByRole };
}

export function clearPrShiftSession(): PrShiftSessionState {
  return { ...EMPTY_PR_SHIFT_SESSION, prCheckInMeta: {}, prMarketplaceApplication: null };
}

/** Clear tied or freelancer cached session when a swap completes for that PR. */
export function patchPrSessionForRole(
  st: {
    prSubRole: PrSubRole | null;
    prSessionByRole: Partial<Record<PrSubRole, PrShiftSessionState>>;
    agencyRoster: AgencyRosterSlot[];
  },
  role: PrSubRole,
  patch: Partial<PrShiftSessionState>,
): {
  prSessionByRole: Partial<Record<PrSubRole, PrShiftSessionState>>;
} & Partial<PrShiftSessionState> {
  const base =
    st.prSessionByRole[role] ?? defaultPrShiftSessionForRole(role, { agencyRoster: st.agencyRoster });
  const next = { ...base, ...patch };
  const prSessionByRole = { ...st.prSessionByRole, [role]: next };

  if (st.prSubRole === role) {
    return { prSessionByRole, ...applyPrShiftSession(next) };
  }
  return { prSessionByRole };
}
