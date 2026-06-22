/** PR spec features beyond base pr-demo — marketplace, notifications, swaps, ratings */

import type { PrShiftOffer } from "@/lib/pr-demo";
import { PR_SHIFT_OFFERS, SHIFT_TODAY, fmtDateLabelFromIso, fmtDtable, shiftTodayIso } from "@/lib/pr-demo";
import { SEED_AGENCY_ROSTER, type AgencyRosterSlot } from "@/lib/agency-demo";
import { migrateDemoYmd } from "@/lib/demo-clock";
import { DEFAULT_ROSTER_DATE_ISO, isDemoDateOnOrAfter } from "@/lib/roster-availability";
import { outletMatches } from "@/lib/portal-sync";

export interface TierSlot {
  tier: string;
  count: number;
  hours: string;
}

export interface MarketplaceListing extends PrShiftOffer {
  id: string;
  area: string;
  rate: number;
  role: string;
  languages: string[];
  tierMin: number;
  tierSlots: TierSlot[];
  briefing: string;
  lat: number;
  lng: number;
}

export interface AgencyTiedOffer extends PrShiftOffer {
  id: string;
  agencyName: string;
  briefing: string;
}

export interface PrUpcomingShift {
  id: string;
  outlet: string;
  date: [number, number, number];
  time: string;
  status: "confirmed" | "pending";
}

export type PrNotificationKind =
  | "pv"
  | "assignment"
  | "application"
  | "swap"
  | "rating"
  | "sos"
  | "special_service";

export interface PrNotification {
  id: string;
  kind: PrNotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** When set, only this roster PR sees the notification in the host portal */
  prId?: string;
  /** Route target e.g. /host/history?tab=pv or pv id */
  href?: string;
  pvId?: string;
}

export function prNotificationsForRecipient(
  notifications: PrNotification[],
  prId: string,
): PrNotification[] {
  return notifications.filter((n) => !n.prId || n.prId === prId);
}

export type PrSwapRequestStatus =
  | "pending_agency"
  | "pending_replacement"
  | "approved"
  | "declined";

export interface PrSwapRequest {
  id: string;
  /** PR's current shift being vacated */
  rosterSlotId: string;
  requestingPrId: string;
  requestingPrName: string;
  outlet: string;
  date: string;
  dateIso: string;
  shift: string;
  /** Shift the PR wants to move to — optional for swaps saved before target field existed */
  targetOutlet?: string;
  targetDate?: string;
  targetDateIso?: string;
  targetShift?: string;
  targetRosterSlotId?: string;
  targetOfferId?: string;
  reason: string;
  status: PrSwapRequestStatus;
  requestedAt: string;
  /** Set when agency picks a replacement — awaiting their accept/decline */
  replacementPrId?: string;
  replacementPrName?: string;
  replacementOfferedAt?: string;
  /** Set when replacement declines — agency picks another PR */
  replacementDeclineReason?: string;
  replacementDeclinedAt?: string;
}

/** Swap blocks the requesting PR from treating the shift as active (awaiting replacement or done). */
export function swapBlocksRequestingPrShift(
  swaps: PrSwapRequest[],
  prId: string,
  rosterSlotId?: string,
  dateIso: string = DEFAULT_ROSTER_DATE_ISO,
): PrSwapRequest | undefined {
  return swaps.find((s) => {
    if (s.requestingPrId !== prId) return false;
    if (s.status !== "pending_replacement") return false;
    if (rosterSlotId && s.rosterSlotId === rosterSlotId) return true;
    if (s.dateIso === dateIso) return true;
    return false;
  });
}

/** Removed from demo — drop on hydrate / reset so agency inbox stays clean */
export const RETIRED_DEMO_SWAP_IDS = new Set(["swap-seed-1"]);

/** Drop resolved / stale swap inbox rows after hydrate. */
export function mergePrSwapRequests(
  persisted: PrSwapRequest[] | undefined,
  seed: PrSwapRequest[] = SEED_PR_SWAP_REQUESTS,
  agencyRoster: AgencyRosterSlot[] = SEED_AGENCY_ROSTER,
): PrSwapRequest[] {
  const withoutRetired = (list: PrSwapRequest[]) =>
    list.filter((s) => !RETIRED_DEMO_SWAP_IDS.has(s.id));
  const persistedClean = withoutRetired(persisted ?? []);
  const seedClean = withoutRetired(seed);
  const base = persistedClean.length ? persistedClean : seedClean;
  return base.filter((swap) => {
    if (swap.status !== "pending_agency" && swap.status !== "pending_replacement") return true;
    const slot = agencyRoster.find((s) => s.id === swap.rosterSlotId);
    if (!slot) return false;
    if (slot.prId !== swap.requestingPrId) return false;
    return true;
  });
}

export function pendingSwapOffersForPr(swaps: PrSwapRequest[], prId: string): PrSwapRequest[] {
  return swaps.filter((s) => s.status === "pending_replacement" && s.replacementPrId === prId);
}

export interface PrSwapTargetOption {
  id: string;
  kind: "roster" | "offer";
  outlet: string;
  date: string;
  dateIso: string;
  shift: string;
  rosterSlotId?: string;
  offerId?: string;
}

/** Shifts a PR can swap into — excludes their current booked shift. */
export function swapTargetOptionsForPr(
  roster: AgencyRosterSlot[],
  prId: string,
  sourceSlot: AgencyRosterSlot | undefined,
  tiedOffers: AgencyTiedOffer[],
  declinedOfferIds: string[] = [],
): PrSwapTargetOption[] {
  if (!sourceSlot) return [];

  const seen = new Set<string>();
  const targets: PrSwapTargetOption[] = [];

  const add = (option: PrSwapTargetOption) => {
    if (outletMatches(option.outlet, sourceSlot.outlet) && option.dateIso === sourceSlot.dateIso) {
      return;
    }
    const key = `${option.outlet}|${option.dateIso}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(option);
  };

  for (const slot of roster) {
    if (slot.id === sourceSlot.id) continue;
    if (slot.prId !== prId || slot.status !== "assignment-pending") continue;
    if (!isDemoDateOnOrAfter(slot.dateIso)) continue;
    add({
      id: `roster-${slot.id}`,
      kind: "roster",
      outlet: slot.outlet,
      date: slot.date,
      dateIso: slot.dateIso,
      shift: slot.shift,
      rosterSlotId: slot.id,
    });
  }

  for (const offer of tiedOffers) {
    if (declinedOfferIds.includes(offer.id)) continue;
    if (outletMatches(offer.outlet, sourceSlot.outlet)) continue;
    const dateIso = `${offer.date[0]}-${String(offer.date[1]).padStart(2, "0")}-${String(offer.date[2]).padStart(2, "0")}`;
    if (!isDemoDateOnOrAfter(dateIso)) continue;
    add({
      id: `offer-${offer.id}`,
      kind: "offer",
      outlet: offer.outlet,
      date: fmtDateLabelFromIso(dateIso),
      dateIso,
      shift: offer.time,
      offerId: offer.id,
    });
  }

  return targets.sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.outlet.localeCompare(b.outlet),
  );
}

export const SEED_PR_SWAP_REQUESTS: PrSwapRequest[] = [];

export interface PrPendingRating {
  id: string;
  outlet: string;
  shiftDate: string;
  expiresAt: number;
}

export interface PrRatingRecord {
  id: string;
  outlet: string;
  stars: number;
  direction: "pr_rates_outlet" | "outlet_rates_pr";
  date: string;
}

/** @deprecated Use SosIncident from @/lib/ops-notifications */
export type { SosIncident } from "@/lib/ops-notifications";

/** Agency code → id (freelancer payroll link) */
export const PR_AGENCY_CODES: Record<string, string> = {
  ATLAS2026: "atlas",
  LUNA26: "luna",
  NOVA26: "nova",
};

export const PR_AGENCY_TIED_OFFERS: AgencyTiedOffer[] = [
  {
    id: "tied-velvet",
    agencyName: "Atlas Agency",
    outlet: "Velvet 23",
    event: "VIP Night · Agency offer",
    date: [2026, 6, 4],
    time: "22:00 — 04:00",
    endNext: true,
    distance: "1.2 km",
    addr: "Jalan Changkat, KL",
    base: 280,
    comm: 40,
    vip: true,
    rating: "4.8",
    briefing: "Black dress code. VIP tables 1–8. Mandarin preferred for host table.",
  },
  {
    id: "tied-mermate",
    agencyName: "Atlas Agency",
    outlet: "Mermate",
    event: "Weekend regular",
    date: [2026, 6, 5],
    time: "21:00 — 02:00",
    endNext: true,
    distance: "2.8 km",
    addr: "Bangsar, KL",
    base: 260,
    comm: 35,
    vip: false,
    rating: "4.7",
    briefing: "Casual smart. Agency pre-confirmed rate RM260 + comm.",
  },
  {
    id: "tied-onyx",
    agencyName: "Atlas Agency",
    outlet: "Onyx KL",
    event: "Thursday lounge",
    date: [2026, 6, 4],
    time: "21:00 — 03:00",
    endNext: true,
    distance: "3.4 km",
    addr: "Jalan P. Ramlee, KL",
    base: 240,
    comm: 40,
    vip: false,
    rating: "4.6",
    briefing: "Same-night coverage. Smart casual. English + Cantonese helpful.",
  },
  {
    id: "tied-bear",
    agencyName: "Atlas Agency",
    outlet: "Bear Lounge",
    event: "Lounge launch",
    date: [2026, 6, 5],
    time: "22:30 — 04:30",
    endNext: true,
    distance: "4.5 km",
    addr: "Damansara, PJ",
    base: 270,
    comm: 38,
    vip: true,
    rating: "4.8",
    briefing: "Launch night floor. Black dress code. High table turnover expected.",
  },
  {
    id: "tied-urban",
    agencyName: "Atlas Agency",
    outlet: "Urban Soul",
    event: "Friday party",
    date: [2026, 6, 5],
    time: "20:00 — 01:00",
    endNext: true,
    distance: "5.1 km",
    addr: "Bukit Bintang, KL",
    base: 220,
    comm: 40,
    vip: true,
    rating: "4.9",
    briefing: "Launch party energy. Heels required. Tier III+ preferred.",
  },
  {
    id: "tied-mermate-sat",
    agencyName: "Atlas Agency",
    outlet: "Mermate",
    event: "Saturday VIP",
    date: [2026, 6, 6],
    time: "21:00 — 02:00",
    endNext: true,
    distance: "2.8 km",
    addr: "Bangsar, KL",
    base: 280,
    comm: 45,
    vip: true,
    rating: "4.8",
    briefing: "VIP tables only. Mandarin preferred. Agency pre-approved rate.",
  },
];

export const PR_MARKETPLACE_LISTINGS: MarketplaceListing[] = PR_SHIFT_OFFERS.map((s, i) => ({
  ...s,
  id: `mkt-${i}`,
  area: i === 0 ? "Changkat" : i === 1 ? "KLCC" : "Bukit Bintang",
  rate: s.base + s.comm,
  role: "PR Host",
  languages:
    i === 0
      ? ["English", "Mandarin"]
      : i === 1
        ? ["English", "Cantonese"]
        : ["English", "Mandarin", "Cantonese"],
  tierMin: i === 0 ? 4 : 3,
  tierSlots: [
    { tier: "Tier IV", count: 2, hours: "22:00–01:00" },
    { tier: "Tier III", count: 3, hours: "23:00–03:00" },
  ],
  briefing:
    i === 0
      ? "Rooftop VIP. Smart casual. Outlet scans your QR to attribute sales."
      : i === 1
        ? "Lounge floor. Heels required. Apply — outlet confirms within 2h."
        : "Launch party. High energy. Split blocks by tier shown below.",
  lat: 3.1478 + i * 0.01,
  lng: 101.7005 + i * 0.01,
}));

export function remapSeedUpcomingShift(shift: PrUpcomingShift): PrUpcomingShift {
  return { ...shift, date: migrateDemoYmd(shift.date) };
}

export function remapSeedUpcomingShifts(shifts: PrUpcomingShift[]): PrUpcomingShift[] {
  return shifts.map(remapSeedUpcomingShift);
}

export const SEED_UPCOMING_SHIFTS: PrUpcomingShift[] = [
  {
    id: "up-1",
    outlet: "Bear Lounge",
    date: [2026, 6, 6],
    time: "21:00 — 02:00",
    status: "confirmed",
  },
  {
    id: "up-2",
    outlet: "Urban Soul",
    date: [2026, 6, 7],
    time: "20:00 — 01:00",
    status: "pending",
  },
].map(remapSeedUpcomingShift);

export const SEED_PR_NOTIFICATIONS: PrNotification[] = [
  {
    id: "n-pv-1",
    kind: "pv",
    title: "Payment Voucher ready",
    body: "PV-2026-0512 · RM1,630 net — Finance Head pre-signed. Review & sign.",
    at: "10 May · 09:20",
    read: false,
    href: "/host/PaymentVoucher",
    pvId: "PV-2026-0512",
    prId: "p1",
  },
  {
    id: "n-rate-1",
    kind: "rating",
    title: "Rate Velvet 23",
    body: `Mutual rating window — 18h left after your ${fmtDtable(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2])} Jun shift.`,
    at: "5 Jun · 02:30",
    read: false,
    href: "/host/profile",
    prId: "p1",
  },
];

export const SEED_PENDING_RATINGS: PrPendingRating[] = [
  {
    id: "pr-rate-velvet",
    outlet: "Velvet 23",
    shiftDate: fmtDateLabelFromIso(shiftTodayIso()).replace(/^\w+ · /, ""),
    expiresAt: Date.now() + 18 * 60 * 60 * 1000,
  },
];

export const SEED_RATING_HISTORY: PrRatingRecord[] = [
  { id: "rh-1", outlet: "Mermate", stars: 5, direction: "outlet_rates_pr", date: "27 Apr 2026" },
  { id: "rh-2", outlet: "Mermate", stars: 4, direction: "pr_rates_outlet", date: "27 Apr 2026" },
];

/** Demo: tied 8 months ago — under 1-year lock */
export const DEMO_AGENCY_TIED_AT = "2025-10-04";

export function listingById(id: string): MarketplaceListing | undefined {
  return PR_MARKETPLACE_LISTINGS.find((l) => l.id === id);
}

export function tiedOfferById(id: string): AgencyTiedOffer | undefined {
  return PR_AGENCY_TIED_OFFERS.find((o) => o.id === id);
}

export function offerToShiftIndex(listingId: string): number {
  const listing = listingById(listingId);
  if (!listing) return 0;
  return PR_SHIFT_OFFERS.findIndex((s) => s.outlet === listing.outlet);
}

export function tiedOfferToShiftIndex(offerId: string): number {
  const offer = tiedOfferById(offerId);
  if (!offer) return 0;
  return PR_SHIFT_OFFERS.findIndex((s) => s.outlet === offer.outlet);
}

export function monthsSinceTied(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date(2026, 5, 4);
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

export function isWithinOneYearTie(isoDate: string): boolean {
  return monthsSinceTied(isoDate) < 12;
}
