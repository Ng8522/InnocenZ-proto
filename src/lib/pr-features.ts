/** PR spec features beyond base pr-demo — marketplace, notifications, swaps, ratings */

import type { PrShiftOffer } from "@/lib/pr-demo";
import { PR_SHIFT_OFFERS, SHIFT_TODAY } from "@/lib/pr-demo";

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

export type PrNotificationKind = "pv" | "assignment" | "application" | "swap" | "rating" | "sos";

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

export interface PrSelfLog {
  id: string;
  outlet: string;
  category: "drinks" | "tips" | "tables";
  qty: number;
  amount: number;
  note?: string;
  status: "pending_outlet" | "confirmed" | "flagged";
  loggedAt: string;
  shiftSessionId?: string;
}

export interface PrSwapRequest {
  id: string;
  outlet: string;
  date: string;
  replacementPrName: string;
  reason: string;
  status: "pending_agency" | "approved" | "declined";
  requestedAt: string;
}

export const SEED_PR_SWAP_REQUESTS: PrSwapRequest[] = [
  {
    id: "swap-seed-1",
    outlet: "Velvet 23",
    date: "4 Jun 2026",
    replacementPrName: "Chen Wei",
    reason: "Family emergency — replacement confirmed available",
    status: "pending_agency",
    requestedAt: "4 Jun 2026 · 18:20",
  },
];

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

export interface SosIncident {
  id: string;
  at: string;
  note: string;
  photoDataUrl?: string;
  locationLabel: string;
}

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
];

export const PR_MARKETPLACE_LISTINGS: MarketplaceListing[] = PR_SHIFT_OFFERS.map((s, i) => ({
  ...s,
  id: `mkt-${i}`,
  area: i === 0 ? "Changkat" : i === 1 ? "KLCC" : "Bukit Bintang",
  rate: s.base + s.comm,
  role: "PR Host",
  languages: i === 0 ? ["English", "Mandarin"] : i === 1 ? ["English", "Cantonese"] : ["English", "Mandarin", "Cantonese"],
  tierMin: i === 0 ? 4 : 3,
  tierSlots: [
    { tier: "Tier IV", count: 2, hours: "22:00–01:00" },
    { tier: "Tier III", count: 3, hours: "23:00–03:00" },
  ],
  briefing:
    i === 0
      ? "Rooftop VIP. Smart casual. Outlet scans your QR or confirms self-logged sales."
      : i === 1
        ? "Lounge floor. Heels required. Apply — outlet confirms within 2h."
        : "Launch party. High energy. Split blocks by tier shown below.",
  lat: 3.1478 + i * 0.01,
  lng: 101.7005 + i * 0.01,
}));

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
];

export const SEED_PR_NOTIFICATIONS: PrNotification[] = [
  {
    id: "n-pv-1",
    kind: "pv",
    title: "Payment Voucher ready",
    body: "PV-2026-0512 · RM1,630 net — Finance Head pre-signed. Review & sign.",
    at: "10 May · 09:20",
    read: false,
    href: "/host/wallet",
    pvId: "PV-2026-0512",
    prId: "p1",
  },
  {
    id: "n-rate-1",
    kind: "rating",
    title: "Rate Velvet 23",
    body: "Mutual rating window — 18h left after your 4 Jun shift.",
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
    shiftDate: "4 Jun 2026",
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
