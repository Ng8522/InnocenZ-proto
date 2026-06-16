import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { fmtDateLabelFromIso } from "@/lib/pr-demo";
import { outletMatches } from "@/lib/portal-sync";
import {
  type PartyAcceptance,
  type SpecialServiceInitiator,
  type SpecialServiceRecord,
  type SpecialServiceStatus,
  recomputeSpecialServiceStatus,
  specialServiceOffer,
} from "@/lib/special-service-demo";

export type SubmitSpecialServiceInput = {
  initiatedBy: SpecialServiceInitiator;
  raisedBy: string;
  prId: string;
  prName: string;
  outlet: string;
  serviceType: string;
  description: string;
  amountIn: number;
  amountOut: number;
  time: string;
  dateIso?: string;
};

function stampNow() {
  return new Date().toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRealOutlet(outlet: string) {
  return outlet.trim().length > 0 && outlet !== "Agency service";
}

function withStatus(record: SpecialServiceRecord): SpecialServiceRecord {
  return { ...record, status: recomputeSpecialServiceStatus(record) };
}

export function buildSpecialServiceOrder(
  input: SubmitSpecialServiceInput,
  id: string,
): SpecialServiceRecord {
  const dateIso = input.dateIso ?? DEFAULT_ROSTER_DATE_ISO;
  const offer = specialServiceOffer(input.serviceType);
  const hasOutlet = isRealOutlet(input.outlet);
  const hasPr = Boolean(input.prId);

  let agencyAccepted: PartyAcceptance = "pending";
  let prAcceptance: PartyAcceptance = "n/a";
  let outletAcceptance: PartyAcceptance = "n/a";

  if (input.initiatedBy === "agency") {
    agencyAccepted = "accepted";
    if (hasPr) prAcceptance = "pending";
    if (hasOutlet) outletAcceptance = "pending";
  } else if (input.initiatedBy === "outlet") {
    agencyAccepted = "pending";
    outletAcceptance = "accepted";
    prAcceptance = "n/a";
  } else {
    agencyAccepted = "pending";
    prAcceptance = "accepted";
    outletAcceptance = "n/a";
  }

  const base: SpecialServiceRecord = {
    id,
    prId: input.prId,
    prName: input.prName,
    outlet: input.outlet,
    date: fmtDateLabelFromIso(dateIso),
    dateIso,
    time: input.time,
    serviceType: input.serviceType,
    description: input.description.trim() || offer?.summary || input.serviceType,
    amountIn: input.amountIn,
    amountOut: input.amountOut,
    initiatedBy: input.initiatedBy,
    raisedBy: input.raisedBy,
    agencyAccepted,
    prAcceptance,
    outletAcceptance,
    status: "pending_agency",
    approvedAt: input.initiatedBy === "agency" ? stampNow() : undefined,
  };

  return withStatus(base);
}

export function approveSpecialServiceByAgency(record: SpecialServiceRecord): SpecialServiceRecord {
  if (record.agencyAccepted !== "pending") return record;

  const next: SpecialServiceRecord = {
    ...record,
    agencyAccepted: "accepted",
    approvedAt: stampNow(),
  };

  // PR self-orders — agency approval confirms (PR already committed).
  if (next.initiatedBy === "pr") {
    return withStatus(next);
  }

  // Outlet orders — outlet committed; assigned PR must accept after agency approval.
  if (next.initiatedBy === "outlet") {
    if (next.prId) {
      next.prAcceptance = "pending";
    }
    return withStatus(next);
  }

  // Agency-initiated — PR and/or outlet must accept.
  if (next.prId && next.prAcceptance === "n/a") {
    next.prAcceptance = "pending";
  }
  if (isRealOutlet(next.outlet) && next.outletAcceptance === "n/a") {
    next.outletAcceptance = "pending";
  }

  return withStatus(next);
}

export function declineSpecialServiceByAgency(
  record: SpecialServiceRecord,
  reason?: string,
): SpecialServiceRecord {
  return withStatus({
    ...record,
    agencyAccepted: "declined",
    declinedBy: "agency",
    declineReason: reason?.trim() || "Declined by agency",
  });
}

export function acceptSpecialServiceByPr(record: SpecialServiceRecord): SpecialServiceRecord {
  if (record.prAcceptance !== "pending") return record;
  return withStatus({ ...record, prAcceptance: "accepted" });
}

export function declineSpecialServiceByPr(
  record: SpecialServiceRecord,
  reason?: string,
): SpecialServiceRecord {
  if (record.prAcceptance !== "pending") return record;
  return withStatus({
    ...record,
    prAcceptance: "declined",
    declinedBy: "pr",
    declineReason: reason?.trim() || "Declined by PR",
  });
}

export function acceptSpecialServiceByOutlet(record: SpecialServiceRecord): SpecialServiceRecord {
  if (record.outletAcceptance !== "pending") return record;
  return withStatus({ ...record, outletAcceptance: "accepted" });
}

export function declineSpecialServiceByOutlet(
  record: SpecialServiceRecord,
  reason?: string,
): SpecialServiceRecord {
  if (record.outletAcceptance !== "pending") return record;
  return withStatus({
    ...record,
    outletAcceptance: "declined",
    declinedBy: "outlet",
    declineReason: reason?.trim() || "Declined by outlet",
  });
}

export function specialServicesForOutlet(
  records: SpecialServiceRecord[],
  outletName: string,
): SpecialServiceRecord[] {
  return records.filter((r) => outletMatches(r.outlet, outletName));
}

export function specialServicesForPr(
  records: SpecialServiceRecord[],
  prId: string,
): SpecialServiceRecord[] {
  return records.filter((r) => r.prId === prId);
}

export function pendingSpecialServicesForPr(
  records: SpecialServiceRecord[],
  prId: string,
): SpecialServiceRecord[] {
  return records.filter(
    (r) => r.prId === prId && r.prAcceptance === "pending" && r.initiatedBy !== "pr",
  );
}

export function pendingSpecialServicesForOutlet(
  records: SpecialServiceRecord[],
  outletName: string,
): SpecialServiceRecord[] {
  return records.filter(
    (r) =>
      outletMatches(r.outlet, outletName) &&
      r.outletAcceptance === "pending" &&
      r.initiatedBy !== "outlet",
  );
}

export function pendingSpecialServicesForAgency(records: SpecialServiceRecord[]): SpecialServiceRecord[] {
  return records.filter((r) => r.agencyAccepted === "pending");
}

export function isSpecialServiceActionable(
  record: SpecialServiceRecord,
  role: "agency" | "outlet" | "pr",
): boolean {
  if (record.status === "declined" || record.status === "paid") return false;
  if (role === "agency") return record.agencyAccepted === "pending";
  if (role === "pr") return record.prAcceptance === "pending";
  return record.outletAcceptance === "pending";
}
