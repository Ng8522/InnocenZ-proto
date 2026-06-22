import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { fmtDateLabelFromIso } from "@/lib/pr-demo";

export type SpecialServiceInitiator = "agency" | "outlet" | "pr";

export type PartyAcceptance = "pending" | "accepted" | "declined" | "n/a";

export type SpecialServiceStatus =
  | "pending_agency"
  | "pending_pr"
  | "pending_outlet"
  | "pending_both"
  | "confirmed"
  | "declined"
  | "paid";

export type AgencySpecialServiceOffer = {
  id: string;
  label: string;
  summary: string;
  defaultRate: number;
  unit: string;
};

/** Services the agency offers to PRs and outlets beyond standard shift PV */
export const AGENCY_SPECIAL_SERVICE_OFFERS: AgencySpecialServiceOffer[] = [
  {
    id: "transportation",
    label: "Transportation",
    summary: "Shift pickup, late-night return, and outlet transfers",
    defaultRate: 45,
    unit: "per trip",
  },
  {
    id: "delivery",
    label: "Deliveries",
    summary: "Outfits, heels, props, and supplies sent to venue",
    defaultRate: 35,
    unit: "per delivery",
  },
  {
    id: "wardrobe",
    label: "Wardrobe & styling",
    summary: "Gown rental, dress code sourcing, and styling coordination",
    defaultRate: 95,
    unit: "per booking",
  },
  {
    id: "makeup",
    label: "Makeup & grooming",
    summary: "Professional makeup before VIP or launch events",
    defaultRate: 120,
    unit: "per session",
  },
  {
    id: "vip_escort",
    label: "VIP escort",
    summary: "Premium table hosting and high-value guest coverage",
    defaultRate: 180,
    unit: "per shift",
  },
  {
    id: "uniform",
    label: "Uniform & documents",
    summary: "Uniform handling, badge printing, and compliance docs",
    defaultRate: 25,
    unit: "per item",
  },
  {
    id: "emergency_cover",
    label: "Emergency cover",
    summary: "Last-minute replacement PR sourcing and dispatch",
    defaultRate: 150,
    unit: "per call-out",
  },
  {
    id: "training",
    label: "Training top-up",
    summary: "Tier upgrades, coaching sessions, and certification fees",
    defaultRate: 80,
    unit: "per session",
  },
  {
    id: "leave_agency",
    label: "Leave agency",
    summary: "Before 1 year you must raise a support ticket for early leave",
    defaultRate: 0,
    unit: "support ticket",
  },
];

export const LEAVE_AGENCY_SERVICE_ID = "leave_agency";

export function isLeaveAgencyService(serviceType: string): boolean {
  return serviceType === LEAVE_AGENCY_SERVICE_ID;
}

/** Service types available when raising a new order (role-specific). */
export function bookableServiceOffers(
  initiator: SpecialServiceInitiator,
  opts?: { prTiedLocked?: boolean },
): AgencySpecialServiceOffer[] {
  if (initiator === "pr") {
    return AGENCY_SPECIAL_SERVICE_OFFERS.filter(
      (o) => !isLeaveAgencyService(o.id) || opts?.prTiedLocked,
    );
  }
  return AGENCY_SPECIAL_SERVICE_OFFERS.filter((o) => !isLeaveAgencyService(o.id));
}

export const SPECIAL_SERVICE_TYPE_LABELS = Object.fromEntries(
  AGENCY_SPECIAL_SERVICE_OFFERS.map((s) => [s.id, s.label]),
) as Record<string, string>;

export type SpecialServiceRecord = {
  id: string;
  prId: string;
  prName: string;
  outlet: string;
  date: string;
  dateIso: string;
  time: string;
  serviceType: string;
  description: string;
  amountIn: number;
  amountOut: number;
  initiatedBy: SpecialServiceInitiator;
  raisedBy: string;
  agencyAccepted: PartyAcceptance;
  prAcceptance: PartyAcceptance;
  outletAcceptance: PartyAcceptance;
  status: SpecialServiceStatus;
  approvedAt?: string;
  declineReason?: string;
  declinedBy?: "agency" | "pr" | "outlet";
};

export function recomputeSpecialServiceStatus(record: SpecialServiceRecord): SpecialServiceStatus {
  if (record.status === "paid") return "paid";

  if (
    record.agencyAccepted === "declined" ||
    record.prAcceptance === "declined" ||
    record.outletAcceptance === "declined"
  ) {
    return "declined";
  }

  if (record.initiatedBy !== "agency" && record.agencyAccepted === "pending") {
    return "pending_agency";
  }

  const needsPr = record.prAcceptance !== "n/a";
  const needsOutlet = record.outletAcceptance !== "n/a";
  const prOk = !needsPr || record.prAcceptance === "accepted";
  const outletOk = !needsOutlet || record.outletAcceptance === "accepted";

  if (prOk && outletOk) return "confirmed";

  const prPending = needsPr && record.prAcceptance === "pending";
  const outletPending = needsOutlet && record.outletAcceptance === "pending";

  if (prPending && outletPending) return "pending_both";
  if (prPending) return "pending_pr";
  if (outletPending) return "pending_outlet";

  return "confirmed";
}

export type SpecialServiceFilterState = {
  date: string;
  time: string;
  serviceType: string;
  status: "all" | SpecialServiceStatus;
  amountInMin: string;
  amountOutMin: string;
};

export const EMPTY_SPECIAL_SERVICE_FILTERS: SpecialServiceFilterState = {
  date: "",
  time: "",
  serviceType: "",
  status: "all",
  amountInMin: "",
  amountOutMin: "",
};

const DEMO_TODAY_LABEL = fmtDateLabelFromIso(DEFAULT_ROSTER_DATE_ISO);

export const SEED_SPECIAL_SERVICES: SpecialServiceRecord[] = [
  {
    id: "SS-2026-014",
    prId: "p1",
    prName: "Vicky",
    outlet: "Velvet 23",
    date: DEMO_TODAY_LABEL,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    time: "22:00",
    serviceType: "vip_escort",
    description: "VIP table escort — Hennessy launch · 3h premium coverage",
    amountIn: 250,
    amountOut: 180,
    initiatedBy: "agency",
    raisedBy: "Agency Owner",
    agencyAccepted: "accepted",
    prAcceptance: "accepted",
    outletAcceptance: "accepted",
    status: "confirmed",
    approvedAt: "18 Jun 2026 · 14:20",
  },
  {
    id: "SS-2026-015",
    prId: "p2",
    prName: "Mia",
    outlet: "Onyx KL",
    date: DEMO_TODAY_LABEL,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    time: "04:15",
    serviceType: "transportation",
    description: "Late-night return after 04:00 shift — agency Grab booking",
    amountIn: 0,
    amountOut: 45,
    initiatedBy: "pr",
    raisedBy: "Mia (PR)",
    agencyAccepted: "pending",
    prAcceptance: "accepted",
    outletAcceptance: "n/a",
    status: "pending_agency",
  },
  {
    id: "SS-2026-016",
    prId: "p4",
    prName: "Cici",
    outlet: "Velvet 23",
    date: DEMO_TODAY_LABEL,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    time: "19:30",
    serviceType: "delivery",
    description: "Heels + clutch delivered to outlet before Ladies Night",
    amountIn: 50,
    amountOut: 35,
    initiatedBy: "outlet",
    raisedBy: "Velvet 23",
    agencyAccepted: "pending",
    prAcceptance: "n/a",
    outletAcceptance: "accepted",
    status: "pending_agency",
  },
  {
    id: "SS-2026-017",
    prId: "p1",
    prName: "Vicky",
    outlet: "Velvet 23",
    date: DEMO_TODAY_LABEL,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    time: "20:00",
    serviceType: "makeup",
    description: "Agency-booked makeup session before VIP table — confirm availability",
    amountIn: 80,
    amountOut: 120,
    initiatedBy: "agency",
    raisedBy: "Agency Owner",
    agencyAccepted: "accepted",
    prAcceptance: "pending",
    outletAcceptance: "pending",
    status: "pending_both",
    approvedAt: "18 Jun 2026 · 10:05",
  },
  {
    id: "SS-2026-011",
    prId: "p6",
    prName: "Yuki",
    outlet: "Mermate",
    date: "Wed 03 Jun 2026",
    dateIso: "2026-06-03",
    time: "18:00",
    serviceType: "makeup",
    description: "Professional makeup before weekend VIP slot",
    amountIn: 0,
    amountOut: 120,
    initiatedBy: "agency",
    raisedBy: "Agency Owner",
    agencyAccepted: "accepted",
    prAcceptance: "accepted",
    outletAcceptance: "n/a",
    status: "paid",
    approvedAt: "3 Jun 2026 · 18:05",
  },
  {
    id: "SS-2026-009",
    prId: "p3",
    prName: "Vivi",
    outlet: "Bear Lounge",
    date: "Tue 02 Jun 2026",
    dateIso: "2026-06-02",
    time: "17:45",
    serviceType: "wardrobe",
    description: "Gown rental — lounge launch black-dress code",
    amountIn: 120,
    amountOut: 95,
    initiatedBy: "outlet",
    raisedBy: "Bear Lounge",
    agencyAccepted: "accepted",
    prAcceptance: "accepted",
    outletAcceptance: "n/a",
    status: "paid",
    approvedAt: "2 Jun 2026 · 11:40",
  },
  {
    id: "SS-2026-008",
    prId: "p5",
    prName: "Nina",
    outlet: "Urban Soul",
    date: "Mon 02 Jun 2026",
    dateIso: "2026-06-02",
    time: "20:30",
    serviceType: "emergency_cover",
    description: "Same-day cover dispatch when outlet PR no-showed",
    amountIn: 200,
    amountOut: 150,
    initiatedBy: "outlet",
    raisedBy: "Urban Soul",
    agencyAccepted: "accepted",
    prAcceptance: "accepted",
    outletAcceptance: "n/a",
    status: "paid",
    approvedAt: "2 Jun 2026 · 19:10",
  },
];

export function specialServiceOffer(id: string): AgencySpecialServiceOffer | undefined {
  return AGENCY_SPECIAL_SERVICE_OFFERS.find((s) => s.id === id);
}

function hhmmToMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [h, m] = trimmed.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function specialServiceFiltersActive(f: SpecialServiceFilterState): boolean {
  return Boolean(
    f.date || f.time || f.serviceType || f.status !== "all" || f.amountInMin || f.amountOutMin,
  );
}

export function filterSpecialServiceRecords(
  records: SpecialServiceRecord[],
  f: SpecialServiceFilterState,
): SpecialServiceRecord[] {
  const inMin = f.amountInMin ? Number(f.amountInMin) : null;
  const outMin = f.amountOutMin ? Number(f.amountOutMin) : null;
  const timeFrom = hhmmToMinutes(f.time);

  return records.filter((row) => {
    if (f.status !== "all" && row.status !== f.status) return false;
    if (f.date && row.dateIso !== f.date) return false;
    if (f.serviceType && row.serviceType !== f.serviceType) return false;
    if (timeFrom != null) {
      const rowMins = hhmmToMinutes(row.time);
      if (rowMins == null || rowMins < timeFrom) return false;
    }
    if (inMin != null && !Number.isNaN(inMin) && row.amountIn < inMin) return false;
    if (outMin != null && !Number.isNaN(outMin) && row.amountOut < outMin) return false;
    return true;
  });
}

export function collectSpecialServiceDateIsos(records: SpecialServiceRecord[]): string[] {
  return [...new Set(records.map((r) => r.dateIso))].sort();
}

const SPECIAL_SERVICE_AMOUNT_PRESETS = [
  0, 25, 35, 45, 50, 80, 95, 120, 150, 180, 200, 250,
] as const;

function collectAmountMinOptions(
  records: SpecialServiceRecord[],
  field: "amountIn" | "amountOut",
): number[] {
  const fromOffers = AGENCY_SPECIAL_SERVICE_OFFERS.map((o) => o.defaultRate);
  const fromRecords = records.map((r) => r[field]);
  return [...new Set([...SPECIAL_SERVICE_AMOUNT_PRESETS, ...fromOffers, ...fromRecords])].sort(
    (a, b) => a - b,
  );
}

export function collectSpecialServiceAmountInOptions(records: SpecialServiceRecord[]): number[] {
  return collectAmountMinOptions(records, "amountIn");
}

export function collectSpecialServiceAmountOutOptions(records: SpecialServiceRecord[]): number[] {
  return collectAmountMinOptions(records, "amountOut");
}

export function specialServiceStatusLabel(status: SpecialServiceStatus): string {
  switch (status) {
    case "pending_agency":
      return "Pending agency";
    case "pending_pr":
      return "Awaiting PR";
    case "pending_outlet":
      return "Awaiting outlet";
    case "pending_both":
      return "Awaiting PR & outlet";
    case "confirmed":
      return "Confirmed";
    case "declined":
      return "Declined";
    case "paid":
      return "Paid";
  }
}

export function specialServiceStatusVariant(
  status: SpecialServiceStatus,
): "ink" | "amber" | "green" | "violet" {
  switch (status) {
    case "pending_agency":
    case "pending_pr":
    case "pending_outlet":
    case "pending_both":
      return "amber";
    case "confirmed":
      return "violet";
    case "declined":
      return "ink";
    case "paid":
      return "green";
  }
}

export function specialServiceInitiatorLabel(initiatedBy: SpecialServiceInitiator): string {
  switch (initiatedBy) {
    case "agency":
      return "Agency";
    case "outlet":
      return "Outlet";
    case "pr":
      return "PR";
  }
}

export function specialServiceTypeLabel(type: string): string {
  return SPECIAL_SERVICE_TYPE_LABELS[type] ?? specialServiceOffer(type)?.label ?? type;
}
