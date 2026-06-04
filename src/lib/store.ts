import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type PrSubRole,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrComcard,
  type PrReceiptScan,
  type PrActiveShiftSession,
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  SEED_PR_PVS,
  SEED_RECEIPT_SCANS,
  COMCARD,
  PORTFOLIO_SLOT_COUNT,
  calcReceiptCommissions,
  buildPaymentVoucherFromShift,
  getPrProfile,
  makeShiftSessionId,
  makeShiftPvId,
  FINANCE_HEAD_SIGNER,
  FREELANCER_DEMO_PR_ID,
  DEFAULT_TIED_AGENCY_ID,
  getPrAgencyById,
} from "@/lib/pr-demo";
import {
  type AgencyOwnerSettings,
  type AgencyRosterSlot,
  type AgencyManagedPR,
  type OutletSwapRequest,
  DEFAULT_AGENCY_OWNER,
  SEED_AGENCY_ROSTER,
  mergeAgencyRoster,
  SEED_AGENCY_PRS,
} from "@/lib/agency-demo";
import {
  computeShiftLiveSales,
  recomputeAllOutletPnl,
  withShiftFinancialDefaults,
  type OutletPnlSynced,
} from "@/lib/outlet-financial-sync";
import { type ShiftHistoryRow, SEED_SHIFT_HISTORY } from "@/lib/shift-history";

export type Role = "vendor" | "host" | "agency";

export interface PR {
  id: string;
  name: string;
  rating: number;
  languages: string[];
  status: "available" | "booked" | "pending";
  avatar: string;
}

export interface ShiftRequest {
  id: string;
  outletName: string;
  date: string;
  shift: string;
  quantity: number;
  filled: number;
  languages: string;
  event: string;
  preferredRating: number;
  estimatedCost: number;
  liveSales: number;
  /** Outlet floor pricing — syncs to agency analytics */
  perDrinkRm?: number;
  perTableRm?: number;
  drinkUnits?: number;
  tableUnits?: number;
  /** Baseline live sales when PNL was seeded — delta rolls into gross revenue */
  anchorLiveSales?: number;
  status: "draft" | "open" | "confirmed" | "sealed";
  prs: string[];
  payPerHour: number;
}

export interface PV {
  id: string;
  prName: string;
  outlet: string;
  date: string;
  wages: number;
  drinkCommission: number;
  tipCommission: number;
  tableCommission: number;
  status: "draft" | "sent" | "signed" | "disputed";
  version: number;
}

export interface Booking {
  id: string;
  outletName: string;
  date: string;
  shift: string;
  pay: number;
  status: "offered" | "accepted" | "checked-in" | "completed";
  event: string;
  languages: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface PendingPR {
  id: string;
  name: string;
  languages: string;
  ic?: string;
  mobile?: string;
  email?: string;
  status: "pending" | "approved" | "rejected";
}

/** Freelancer chose this agency for payroll — agency must approve before PVs */
export interface PendingFreelancerPayroll {
  id: string;
  prId: string;
  prName: string;
  languages: string;
  ic: string;
  mobile: string;
  email: string;
  agencyId: string;
  agencyName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

interface Toast { id: number; message: string; tone?: "success" | "info" | "warn" }

interface StoreState {
  role: Role | null;
  prSubRole: PrSubRole | null;
  user: { name: string; email: string } | null;
  setRole: (r: Role | null) => void;
  setPrSubRole: (r: PrSubRole | null) => void;
  signIn: (name: string, email: string) => void;
  signOut: () => void;

  /** PR Talent shift lifecycle (prototype flow) */
  shiftAccepted: boolean;
  pendingApproval: boolean;
  acceptedShiftIndex: number | null;
  checkedIn: boolean;
  checkedOut: boolean;
  drinks: number;
  tables: number;
  outletRatingStars: number;
  prActiveShift: PrActiveShiftSession | null;
  acceptPrShift: () => void;
  approvePrShift: () => void;
  cancelPrShift: () => void;
  resetPrShift: () => void;
  prCheckIn: () => void;
  prCheckOut: () => void;
  setOutletRatingStars: (n: number) => void;

  prComcard: PrComcard;
  prPortfolio: (string | null)[];
  prLanguages: string[];
  prDisplayName: string | null;
  prAvatarPhoto: string | null;
  prPayrollAgencyId: string | null;
  setPrPayrollAgency: (agencyId: string) => void;
  savePrProfile: (data: {
    displayName: string;
    avatarPhoto: string | null;
    comcard: PrComcard;
    portfolio: (string | null)[];
    languages: string[];
  }) => void;

  prPaymentVouchers: PrPaymentVoucher[];
  signPrPv: (id: string) => void;
  disputePrPv: (id: string, reason: string) => void;
  updatePrPvDisputeReason: (id: string, reason: string) => void;

  prReceiptScans: PrReceiptScan[];
  addReceiptScan: (draft: {
    outlet: string;
    prCode: string;
    prName: string;
    items: PrReceiptScan["items"];
    totalLogged: number;
  }) => string;
  editAgencyPv: (id: string, patch: { rows?: PrPvRow[]; deduct?: number; disputeNote?: string }) => void;
  resendAgencyPv: (id: string) => void;
  resolveAgencyPvDispute: (id: string) => void;

  agencyOwner: AgencyOwnerSettings;
  saveAgencyOwner: (patch: Partial<AgencyOwnerSettings>) => void;
  sendAgencyOtp: () => void;
  verifyAgencyOtp: (code: string) => boolean;

  agencyRoster: AgencyRosterSlot[];
  editRosterSlot: (id: string, patch: Partial<AgencyRosterSlot>) => void;
  requestOutletSwap: (id: string, targetOutlet: string, agencyNote?: string) => void;
  cancelOutletSwap: (id: string) => void;
  approveOutletSwapByPr: (rosterSlotId: string) => void;
  declineOutletSwapByPr: (rosterSlotId: string) => void;
  approveAgencyAssignmentByPr: (rosterSlotId: string) => void;
  declineAgencyAssignmentByPr: (rosterSlotId: string) => void;
  assignPrToOutlet: (input: {
    prId: string;
    outlet: string;
    dateIso: string;
    dateLabel: string;
    shiftStart: string;
    shiftEnd: string;
  }) => void;

  agencyPRs: AgencyManagedPR[];
  /** Shared transaction log — agency & outlet history screens */
  shiftHistory: ShiftHistoryRow[];

  prs: PR[];
  shifts: ShiftRequest[];
  /** Agency analytics PNL — recomputed when outlet edits floor money */
  outletPnl: OutletPnlSynced[];
  outletPnlSyncAt: number;
  outletMoneyEditCount: number;
  updateOutletShiftMoney: (
    shiftId: string,
    patch: { perDrinkRm?: number; perTableRm?: number },
  ) => void;
  adjustOutletShiftUnits: (shiftId: string, kind: "drink" | "table", delta: number) => void;
  bookings: Booking[];
  pvs: PV[];
  walletBalance: number;
  ratings: { id: string; pr: string; stars: number; note: string; date: string }[];
  pendingPRs: PendingPR[];
  pendingFreelancerPayrolls: PendingFreelancerPayroll[];

  approvePendingPR: (id: string) => void;
  rejectPendingPR: (id: string) => void;
  approveFreelancerPayroll: (id: string) => void;
  rejectFreelancerPayroll: (id: string) => void;

  createShift: (s: Omit<ShiftRequest, "id" | "status" | "filled" | "prs">) => string;
  togglePrOnShift: (shiftId: string, prId: string) => void;
  confirmShift: (shiftId: string) => void;
  sealShift: (shiftId: string) => void;

  acceptBooking: (id: string) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;

  signPv: (id: string) => void;
  disputePv: (id: string, reason: string) => void;
  withdraw: (amount: number) => void;
  ratePr: (prId: string, stars: number, note: string) => void;

  toasts: Toast[];
  toast: (m: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

const seedPRs: PR[] = [
  { id: "p1", name: "Luna", rating: 4.9, languages: ["EN", "中文"], status: "available", avatar: "🌙" },
  { id: "p2", name: "Mia", rating: 4.8, languages: ["EN", "中文"], status: "available", avatar: "✨" },
  { id: "p3", name: "Vivi", rating: 4.7, languages: ["EN", "BM"], status: "available", avatar: "🥂" },
  { id: "p4", name: "Cici", rating: 4.6, languages: ["EN", "中文"], status: "available", avatar: "💎" },
  { id: "p5", name: "Nina", rating: 4.5, languages: ["EN", "BM"], status: "available", avatar: "🌹" },
  { id: "p6", name: "Yuki", rating: 4.8, languages: ["EN", "中文", "日本語"], status: "available", avatar: "🎐" },
];

const seedShifts: ShiftRequest[] = [
  withShiftFinancialDefaults({
    id: "s1",
    outletName: "Velvet 23",
    date: "Tonight",
    shift: "22:00 — 04:00",
    quantity: 6,
    filled: 6,
    languages: "EN / 中文",
    event: "Private VIP — Hennessy Launch",
    preferredRating: 4.5,
    estimatedCost: 2160,
    liveSales: 570,
    status: "confirmed",
    prs: ["p1", "p2", "p3", "p4"],
    payPerHour: 60,
  }),
];

function applyOutletFinancialSync(
  shifts: ShiftRequest[],
  editCount: number,
  syncAt: number,
): Pick<StoreState, "shifts" | "outletPnl" | "outletPnlSyncAt" | "outletMoneyEditCount"> {
  const normalized = shifts.map(withShiftFinancialDefaults);
  return {
    shifts: normalized,
    outletPnl: recomputeAllOutletPnl(normalized),
    outletPnlSyncAt: syncAt,
    outletMoneyEditCount: editCount,
  };
}

const seedBookings: Booking[] = [
  { id: "b1", outletName: "Velvet 23", date: "Tonight", shift: "22:00 — 04:00", pay: 360, status: "offered", event: "Hennessy Launch", languages: "EN / 中文" },
  { id: "b2", outletName: "Noir Lounge", date: "Tomorrow", shift: "21:00 — 03:00", pay: 320, status: "offered", event: "Ladies Night", languages: "EN / BM" },
  {
    id: "b0",
    outletName: "Onyx KL",
    date: "Last Fri",
    shift: "23:00 — 05:00",
    pay: 340,
    status: "completed",
    event: "VIP Table Night",
    languages: "EN / 中文",
    checkedInAt: "23:02",
    checkedOutAt: "05:01",
  },
];

const seedPVs: PV[] = [
  { id: "pv1", prName: "You", outlet: "Velvet 23", date: "Last Sat", wages: 360, drinkCommission: 84, tipCommission: 45, tableCommission: 30, status: "sent", version: 1 },
];

const seedPendingPRs: PendingPR[] = [
  { id: "pr1", name: "Siti Rahman", languages: "EN · Malay", ic: "960101-14-7788", mobile: "+60 12-881 9901", email: "siti.r@inz.my", status: "pending" },
  { id: "pr2", name: "Chen Wei", languages: "EN · 中文", ic: "970515-10-6622", mobile: "+60 16-772 4410", email: "chen.wei@inz.my", status: "pending" },
];

const seedPendingFreelancerPayrolls: PendingFreelancerPayroll[] = [
  {
    id: "fp-seed-jaya",
    prId: FREELANCER_DEMO_PR_ID,
    prName: "Jaya Nair",
    languages: "English · Cantonese",
    ic: "880214-10-5566",
    mobile: "+60 17-662 3391",
    email: "jaya.nair@inz.my",
    agencyId: DEFAULT_TIED_AGENCY_ID,
    agencyName: "Atlas Agency",
    status: "pending",
    requestedAt: "4 Jun 2026 · 10:42",
  },
];

function mergePendingFreelancerPayrolls(
  persisted: PendingFreelancerPayroll[] | undefined,
  current: PendingFreelancerPayroll[],
): PendingFreelancerPayroll[] {
  const base = persisted && persisted.length > 0 ? persisted : current;
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const seed of seedPendingFreelancerPayrolls) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values());
}

let toastId = 0;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      role: null,
      prSubRole: null,
      user: null,
      setRole: (r) => set({ role: r }),
      setPrSubRole: (r) => set({ prSubRole: r }),
      signIn: (name, email) => set({ user: { name, email } }),
      signOut: () =>
        set({
          user: null,
          role: null,
          prSubRole: null,
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
        }),

      shiftAccepted: false,
      pendingApproval: false,
      acceptedShiftIndex: null,
      checkedIn: false,
      checkedOut: false,
      drinks: 0,
      tables: 0,
      outletRatingStars: 0,
      prActiveShift: null,

      acceptPrShift: () => {
        const tied = get().prSubRole === "pr_tied";
        if (tied) {
          set({ pendingApproval: true, acceptedShiftIndex: 0 });
          get().toast("Sent to Atlas Agency for approval", "warn");
        } else {
          set({ shiftAccepted: true, acceptedShiftIndex: 0, pendingApproval: false });
          get().toast("Shift accepted — slot locked", "success");
        }
      },
      approvePrShift: () => {
        set({ pendingApproval: false, shiftAccepted: true });
        get().toast("Agency approved — slot locked", "success");
      },
      cancelPrShift: () => {
        set({
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
        });
        get().toast("Shift cancelled — penalty flag logged", "warn");
      },
      resetPrShift: () => {
        set({
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
        });
      },
      prCheckIn: () => {
        const idx = get().acceptedShiftIndex ?? 0;
        const offer = PR_SHIFT_OFFERS[idx] ?? PR_SHIFT_OFFERS[0];
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const date = [...SHIFT_TODAY] as [number, number, number];
        const session: PrActiveShiftSession = {
          id: makeShiftSessionId(date, offer.outlet),
          pvId: makeShiftPvId(date, offer.outlet),
          outlet: offer.outlet,
          date,
          shiftTime: offer.time,
          baseWages: offer.base + 70,
          timeIn: stamp,
          receiptIds: [],
        };
        set({ checkedIn: true, prActiveShift: session });
        get().toast(`Checked in ✓ Time-In locked · PV ${session.pvId} opened for this shift`, "success");
      },
      prCheckOut: () => {
        const shift = get().prActiveShift;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        if (!shift) {
          set({ checkedOut: true });
          get().toast("Checked out ✓ duration recorded", "success");
          return;
        }
        const closed: PrActiveShiftSession = { ...shift, timeOut: stamp };
        const scans = (get().prReceiptScans ?? SEED_RECEIPT_SCANS).filter(
          (r) => r.shiftSessionId === shift.id || (r.pvId === shift.pvId && r.status === "attached"),
        );
        const profile = getPrProfile(get().prSubRole);
        const pv = buildPaymentVoucherFromShift(closed, scans, profile);
        const scanIds = new Set(scans.map((s) => s.id));
        set((st) => ({
          checkedOut: true,
          prActiveShift: null,
          prReceiptScans: (st.prReceiptScans ?? SEED_RECEIPT_SCANS).map((r) =>
            scanIds.has(r.id)
              ? { ...r, pvId: shift.pvId, shiftSessionId: shift.id, status: "in_pv" as const, pvStatus: "PENDING_REVIEW" as const }
              : r,
          ),
          prPaymentVouchers: [
            pv,
            ...(st.prPaymentVouchers ?? SEED_PR_PVS).filter((p) => p.id !== pv.id),
          ],
        }));
        get().toast(
          `Checked out ✓ PV ${shift.pvId} generated from ${scans.length} receipt(s) + shift wages`,
          "success",
        );
      },
      setOutletRatingStars: (n) => set({ outletRatingStars: n }),

      prComcard: { ...COMCARD },
      prPortfolio: Array.from({ length: PORTFOLIO_SLOT_COUNT }, () => null),
      prLanguages: ["English", "Mandarin", "Cantonese"],
      prDisplayName: null,
      prAvatarPhoto: null,
      prPayrollAgencyId: null,
      setPrPayrollAgency: (agencyId) => {
        const agency = getPrAgencyById(agencyId);
        if (!agency) return;
        const profile = getPrProfile("pr_free");
        const prId = FREELANCER_DEMO_PR_ID;
        const st = get();
        const existing = st.pendingFreelancerPayrolls.find(
          (p) => p.prId === prId && p.agencyId === agencyId,
        );
        if (existing?.status === "approved") {
          set({ prPayrollAgencyId: agencyId });
          get().toast(`Payroll linked to ${agency.name}`, "success");
          return;
        }
        if (existing?.status === "pending") {
          get().toast(`Waiting for ${agency.name} to approve payroll`, "info");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const langs = st.prLanguages.length ? st.prLanguages : profile.langs;
        set({
          prPayrollAgencyId: null,
          pendingFreelancerPayrolls: [
            ...st.pendingFreelancerPayrolls.filter(
              (p) => !(p.prId === prId && p.agencyId === agencyId),
            ),
            {
              id: "fp-" + Date.now().toString(36),
              prId,
              prName: st.prDisplayName ?? profile.name,
              ic: profile.ic,
              mobile: profile.mobile,
              email: profile.email,
              languages: langs.slice(0, 3).join(" · "),
              agencyId,
              agencyName: agency.name,
              status: "pending",
              requestedAt: stamp,
            },
          ],
        });
        get().toast(
          `Request sent to ${agency.name} — they must approve payroll before PVs unlock`,
          "success",
        );
      },
      savePrProfile: (data) => {
        set({
          prDisplayName: data.displayName.trim(),
          prAvatarPhoto: data.avatarPhoto,
          prComcard: data.comcard,
          prPortfolio: data.portfolio,
          prLanguages: data.languages,
        });
        get().toast("Profile saved — name, photo & comcard updated", "success");
      },

      prPaymentVouchers: SEED_PR_PVS,
      signPrPv: (id) => {
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const bankRef = `INZ-TRF-${Date.now().toString(36).toUpperCase().slice(-8)}`;
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "PAID" as const,
                  prSignedAt: stamp,
                  paidAt: stamp,
                  bankRef,
                }
              : p,
          ),
        }));
        get().toast(
          `Signed ✓ · ${pv.net.toLocaleString("en-MY", { style: "currency", currency: "MYR" })} sent to your bank (${bankRef})`,
          "success",
        );
      },
      disputePrPv: (id, reason) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Describe the issue so your agency can verify", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "DISPUTED" as const,
                  prDisputeReason: trimmed,
                  disputedAt: stamp,
                }
              : p,
          ),
        }));
        get().toast("Dispute submitted — agency notified with your notes", "warn");
      },
      updatePrPvDisputeReason: (id, reason) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Dispute reason cannot be empty", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  prDisputeReason: trimmed,
                  disputeUpdatedAt: stamp,
                }
              : p,
          ),
        }));
        get().toast("Dispute reason updated — agency notified", "success");
      },

      prReceiptScans: SEED_RECEIPT_SCANS,
      addReceiptScan: (draft) => {
        const shift = get().prActiveShift;
        if (!get().checkedIn || get().checkedOut) {
          get().toast("Check in first — receipts only attach to your current shift PV", "warn");
          return "";
        }
        if (!shift) {
          get().toast("No active shift session — check in again", "warn");
          return "";
        }
        const id = `rc-${Date.now().toString(36)}`;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const comm = calcReceiptCommissions(draft.items);
        const outlet = draft.outlet.replace(/\s+KL$/i, "").trim() || draft.outlet;
        const scan: PrReceiptScan = {
          id,
          scannedAt: stamp,
          date: [...shift.date] as [number, number, number],
          outlet,
          prCode: draft.prCode,
          prName: draft.prName,
          items: draft.items,
          totalLogged: draft.totalLogged,
          ...comm,
          shiftSessionId: shift.id,
          pvId: shift.pvId,
          status: "attached",
        };
        set((st) => ({
          prReceiptScans: [scan, ...(st.prReceiptScans ?? SEED_RECEIPT_SCANS)],
          prActiveShift: shift
            ? { ...shift, receiptIds: [...shift.receiptIds, id] }
            : null,
          drinks: st.drinks + draft.items.filter((i) => i.category === "drinks").reduce((s, i) => s + i.qty, 0),
          tables: st.tables + draft.items.filter((i) => i.category === "tables").reduce((s, i) => s + i.qty, 0),
        }));
        get().toast(
          `Receipt logged → ${shift.pvId} · receipt #${shift.receiptIds.length + 1} on this shift`,
          "success",
        );
        return id;
      },

      editAgencyPv: (id, patch) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) => {
            if (p.id !== id) return p;
            const rows = patch.rows ?? p.rows;
            const subtotal = rows.reduce((s, r) => s + r.amt, 0);
            const deduct = patch.deduct ?? p.deduct;
            const net = Math.max(0, subtotal - deduct);
            return {
              ...p,
              ...patch,
              rows,
              subtotal,
              deduct,
              net,
            };
          }),
        }));
        get().toast("PV updated — line items recalculated", "success");
      },
      resendAgencyPv: (id) => {
        const pvs = get().prPaymentVouchers ?? SEED_PR_PVS;
        const pv = pvs.find((p) => p.id === id);
        if (!pv) return;
        const dup = pvs.some(
          (p) =>
            p.id !== id &&
            p.status === "PAID" &&
            p.prName === pv.prName &&
            pv.rows.some((r) => p.paidRefs?.includes(`${r.date}-${r.outlet}-${r.ref}`)),
        );
        if (dup) {
          get().toast("Blocked — duplicate payment detected for same shift ref", "warn");
          return;
        }
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "PENDING_REVIEW" as const, disputeNote: undefined, prDisputeReason: undefined, disputedAt: undefined } : p,
          ),
        }));
        get().toast(`PV ${id} re-sent to ${pv.prName} for e-signature`, "info");
      },
      resolveAgencyPvDispute: (id) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "PENDING_REVIEW" as const, disputeNote: undefined, prDisputeReason: undefined, disputedAt: undefined } : p,
          ),
        }));
        get().toast("Dispute resolved — PV re-sent to PR", "success");
      },

      agencyOwner: { ...DEFAULT_AGENCY_OWNER },
      saveAgencyOwner: (patch) => {
        set((st) => ({ agencyOwner: { ...st.agencyOwner, ...patch } }));
        get().toast("Agency settings saved", "success");
      },
      sendAgencyOtp: () => {
        const ch = get().agencyOwner.otpChannel;
        get().toast(`OTP sent to your ${ch === "email" ? "email" : "mobile"}`, "info");
      },
      verifyAgencyOtp: (code) => {
        if (code === "123456" || code.length === 6) {
          set((st) => ({ agencyOwner: { ...st.agencyOwner, accountActivated: true } }));
          get().toast("Account activated ✓", "success");
          return true;
        }
        get().toast("Invalid OTP — try 123456 for demo", "warn");
        return false;
      },

      agencyRoster: SEED_AGENCY_ROSTER,
      editRosterSlot: (id, patch) => {
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
        get().toast("Roster updated", "success");
      },
      requestOutletSwap: (id, targetOutlet, agencyNote) => {
        const slot = get().agencyRoster.find((s) => s.id === id);
        if (!slot) return;
        if (targetOutlet === slot.outlet) {
          get().toast("Choose a different outlet", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const swap: OutletSwapRequest = {
          targetOutlet,
          status: "pending_pr",
          agencyName: "Atlas Agency",
          agencyNote,
          requestedAt: stamp,
          requestedAtMs: Date.now(),
        };
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === id ? { ...s, status: "swap-pending" as const, outletSwap: swap } : s,
          ),
        }));
        get().toast(`Outlet swap sent to ${slot.prName} — awaiting PR approval`, "success");
      },
      cancelOutletSwap: (id) => {
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: s.status === "swap-pending" ? ("scheduled" as const) : s.status,
                  outletSwap: undefined,
                }
              : s,
          ),
        }));
        get().toast("Outlet swap request cancelled", "info");
      },
      approveOutletSwapByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot?.outletSwap || slot.outletSwap.status !== "pending_pr") return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  outlet: s.outletSwap!.targetOutlet,
                  status: "scheduled" as const,
                  outletSwap: { ...s.outletSwap!, status: "approved" as const, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast(`Approved — shift moved to ${slot.outletSwap.targetOutlet}`, "success");
      },
      assignPrToOutlet: ({ prId, outlet, dateIso, dateLabel, shiftStart, shiftEnd }) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        const existing = get().agencyRoster.find(
          (s) => s.prId === prId && s.dateIso === dateIso,
        );
        if (
          existing &&
          existing.status !== "unavailable" &&
          existing.status !== "assignment-pending"
        ) {
          get().toast(`${pr.name} already has a shift on this date`, "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const id = existing?.id ?? "rs" + Date.now().toString(36).slice(-6);
        const slot: AgencyRosterSlot = {
          id,
          prId,
          prName: pr.name,
          outlet,
          date: dateLabel,
          dateIso,
          shift: `${shiftStart} — ${shiftEnd}`,
          shiftStart,
          shiftEnd,
          status: "assignment-pending",
          agencyAssignment: {
            agencyName: "Atlas Agency",
            assignedAt: stamp,
            assignedAtMs: Date.now(),
          },
        };
        set((st) => ({
          agencyRoster: existing
            ? st.agencyRoster.map((s) => (s.id === existing.id ? slot : s))
            : [slot, ...st.agencyRoster],
        }));
        get().toast(`Assignment sent to ${pr.name} — awaiting Approve or Reject on Shifts`, "success");
      },
      approveAgencyAssignmentByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "assignment-pending") return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  status: "scheduled" as const,
                  agencyAssignment: s.agencyAssignment
                    ? { ...s.agencyAssignment, respondedAt: stamp }
                    : { assignedAt: stamp, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast(`Approved — ${slot.outlet} shift locked on your roster`, "success");
      },
      declineAgencyAssignmentByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "assignment-pending") return;
        set((st) => ({
          agencyRoster: st.agencyRoster.filter((s) => s.id !== rosterSlotId),
        }));
        get().toast(`Rejected agency assignment at ${slot.outlet}`, "warn");
      },
      declineOutletSwapByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot?.outletSwap) return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  status: "scheduled" as const,
                  outletSwap: { ...s.outletSwap!, status: "declined" as const, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast("Declined agency outlet swap", "warn");
      },

      agencyPRs: SEED_AGENCY_PRS,
      shiftHistory: SEED_SHIFT_HISTORY,

      prs: seedPRs,
      shifts: seedShifts,
      outletPnl: recomputeAllOutletPnl(seedShifts),
      outletPnlSyncAt: 0,
      outletMoneyEditCount: 0,
      updateOutletShiftMoney: (shiftId, patch) => {
        const st = get();
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const merged = withShiftFinancialDefaults({ ...sh, ...patch });
          return { ...merged, liveSales: computeShiftLiveSales(merged) };
        });
        const sync = applyOutletFinancialSync(nextShifts, st.outletMoneyEditCount + 1, Date.now());
        set(sync);
        get().toast("Synced to Atlas Agency · PNL & PR commission updated", "success");
      },
      adjustOutletShiftUnits: (shiftId, kind, delta) => {
        const st = get();
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const drinkUnits =
            kind === "drink"
              ? Math.max(0, (sh.drinkUnits ?? 0) + delta)
              : (sh.drinkUnits ?? 0);
          const tableUnits =
            kind === "table"
              ? Math.max(0, (sh.tableUnits ?? 0) + delta)
              : (sh.tableUnits ?? 0);
          const merged = withShiftFinancialDefaults({ ...sh, drinkUnits, tableUnits });
          return { ...merged, liveSales: computeShiftLiveSales(merged) };
        });
        const sync = applyOutletFinancialSync(nextShifts, st.outletMoneyEditCount + 1, Date.now());
        set(sync);
        get().toast("Live sales updated · agency payroll view synced", "info");
      },
      bookings: seedBookings,
      pvs: seedPVs,
      walletBalance: 1240,
      ratings: [],
      pendingPRs: seedPendingPRs,
      pendingFreelancerPayrolls: seedPendingFreelancerPayrolls,

      approvePendingPR: (id) => {
        set((st) => ({
          pendingPRs: st.pendingPRs.map((p) => (p.id === id ? { ...p, status: "approved" } : p)),
        }));
        get().toast("PR approved — shift board unlocked", "success");
      },
      rejectPendingPR: (id) => {
        set((st) => ({
          pendingPRs: st.pendingPRs.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
        }));
        get().toast("PR rejected — notification sent", "warn");
      },
      approveFreelancerPayroll: (id) => {
        const req = get().pendingFreelancerPayrolls.find((p) => p.id === id);
        if (!req) return;
        set((st) => ({
          pendingFreelancerPayrolls: st.pendingFreelancerPayrolls.map((p) =>
            p.id === id ? { ...p, status: "approved" as const } : p,
          ),
          prPayrollAgencyId:
            st.prSubRole === "pr_free" && req.prId === FREELANCER_DEMO_PR_ID
              ? req.agencyId
              : st.prPayrollAgencyId,
        }));
        get().toast(`${req.prName} approved for payroll — PVs can now be raised`, "success");
      },
      rejectFreelancerPayroll: (id) => {
        const req = get().pendingFreelancerPayrolls.find((p) => p.id === id);
        if (!req) return;
        set((st) => ({
          pendingFreelancerPayrolls: st.pendingFreelancerPayrolls.map((p) =>
            p.id === id ? { ...p, status: "rejected" as const } : p,
          ),
          prPayrollAgencyId:
            st.prPayrollAgencyId === req.agencyId && req.prId === FREELANCER_DEMO_PR_ID
              ? null
              : st.prPayrollAgencyId,
        }));
        get().toast(`${req.prName} payroll request declined`, "warn");
      },

      createShift: (s) => {
        const id = "s" + Math.random().toString(36).slice(2, 7);
        set((st) => ({
          shifts: [{ ...s, id, status: "draft", filled: 0, prs: [] }, ...st.shifts],
        }));
        get().toast("Shift request created", "success");
        return id;
      },
      togglePrOnShift: (shiftId, prId) =>
        set((st) => ({
          shifts: st.shifts.map((sh) => {
            if (sh.id !== shiftId) return sh;
            const has = sh.prs.includes(prId);
            const prs = has ? sh.prs.filter((p) => p !== prId) : [...sh.prs, prId];
            return { ...sh, prs, filled: prs.length };
          }),
        })),
      confirmShift: (shiftId) => {
        set((st) => ({
          shifts: st.shifts.map((sh) => sh.id === shiftId ? { ...sh, status: "confirmed" } : sh),
        }));
        get().toast("Booking confirmed · PRs notified", "success");
      },
      sealShift: (shiftId) => {
        set((st) => ({
          shifts: st.shifts.map((sh) => sh.id === shiftId ? { ...sh, status: "sealed" } : sh),
        }));
        get().toast("Shift sealed · PVs generated", "success");
      },

      acceptBooking: (id) => {
        set((st) => ({ bookings: st.bookings.map((b) => b.id === id ? { ...b, status: "accepted" } : b) }));
        get().toast("Shift accepted", "success");
      },
      checkIn: (id) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        set((st) => ({
          bookings: st.bookings.map((b) =>
            b.id === id ? { ...b, status: "checked-in", checkedInAt: time } : b,
          ),
        }));
        get().toast("Checked in · GPS verified", "success");
      },
      checkOut: (id) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        set((st) => ({
          bookings: st.bookings.map((b) =>
            b.id === id ? { ...b, status: "completed", checkedOutAt: time } : b,
          ),
        }));
        get().toast("Checked out · shift saved to history", "info");
      },

      signPv: (id) => {
        const pv = get().pvs.find((p) => p.id === id);
        if (!pv) return;
        const total = pv.wages + pv.drinkCommission + pv.tipCommission + pv.tableCommission;
        set((st) => ({
          pvs: st.pvs.map((p) => p.id === id ? { ...p, status: "signed" } : p),
          walletBalance: st.walletBalance + total,
        }));
        get().toast(`PV signed · RM ${total} credited to wallet`, "success");
      },
      disputePv: (id, reason) => {
        set((st) => ({ pvs: st.pvs.map((p) => p.id === id ? { ...p, status: "disputed" } : p) }));
        get().toast(`Dispute raised: ${reason}`, "warn");
      },
      withdraw: (amount) => {
        if (amount > get().walletBalance) return get().toast("Insufficient balance", "warn");
        set((st) => ({ walletBalance: st.walletBalance - amount }));
        get().toast(`RM ${amount} withdrawal queued · T+1`, "success");
      },
      ratePr: (prId, stars, note) => {
        const pr = get().prs.find((p) => p.id === prId);
        if (!pr) return;
        set((st) => ({
          ratings: [{ id: "r" + Date.now(), pr: pr.name, stars, note, date: new Date().toLocaleDateString() }, ...st.ratings],
        }));
        get().toast("Rating submitted", "success");
      },

      toasts: [],
      toast: (message, tone = "info") => {
        const id = ++toastId;
        set((st) => ({ toasts: [...st.toasts, { id, message, tone }] }));
        setTimeout(() => get().dismissToast(id), 2800);
      },
      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "innocenz-store",
      partialize: (s) => ({
        role: s.role,
        prSubRole: s.prSubRole,
        user: s.user,
        shifts: s.shifts,
        outletPnl: s.outletPnl,
        outletPnlSyncAt: s.outletPnlSyncAt,
        outletMoneyEditCount: s.outletMoneyEditCount,
        bookings: s.bookings,
        pvs: s.pvs,
        walletBalance: s.walletBalance,
        ratings: s.ratings,
        pendingPRs: s.pendingPRs,
        pendingFreelancerPayrolls: s.pendingFreelancerPayrolls,
        shiftAccepted: s.shiftAccepted,
        pendingApproval: s.pendingApproval,
        acceptedShiftIndex: s.acceptedShiftIndex,
        checkedIn: s.checkedIn,
        checkedOut: s.checkedOut,
        drinks: s.drinks,
        tables: s.tables,
        prPaymentVouchers: s.prPaymentVouchers,
        prComcard: s.prComcard,
        prPortfolio: s.prPortfolio,
        prLanguages: s.prLanguages,
        prDisplayName: s.prDisplayName,
        prAvatarPhoto: s.prAvatarPhoto,
        prPayrollAgencyId: s.prPayrollAgencyId,
        prReceiptScans: s.prReceiptScans,
        prActiveShift: s.prActiveShift,
        agencyOwner: s.agencyOwner,
        agencyRoster: s.agencyRoster,
        agencyPRs: s.agencyPRs,
        shiftHistory: s.shiftHistory,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        const seedById = Object.fromEntries(SEED_PR_PVS.map((s) => [s.id, s]));
        const mergedPvs =
          p?.prPaymentVouchers && p.prPaymentVouchers.length > 0
            ? p.prPaymentVouchers.map((pv) => {
                const seed = seedById[pv.id];
                if (!seed) return pv;
                return {
                  ...seed,
                  ...pv,
                  prName: pv.prName ?? seed.prName,
                  issued: pv.issued ?? seed.issued,
                  due: pv.due ?? seed.due,
                  cycle: pv.cycle ?? seed.cycle,
                  financeHeadName: pv.financeHeadName ?? seed.financeHeadName,
                  financeHeadSignedAt: pv.financeHeadSignedAt ?? seed.financeHeadSignedAt,
                  prDisputeReason: pv.prDisputeReason ?? seed.prDisputeReason,
                  disputedAt: pv.disputedAt ?? seed.disputedAt,
                  disputeUpdatedAt: pv.disputeUpdatedAt ?? seed.disputeUpdatedAt,
                  disputeNote: pv.disputeNote ?? seed.disputeNote,
                  shiftSessionId: pv.shiftSessionId ?? seed.shiftSessionId,
                  timeIn: pv.timeIn ?? seed.timeIn,
                  timeOut: pv.timeOut ?? seed.timeOut,
                  shiftTime: pv.shiftTime ?? seed.shiftTime,
                  receiptIds: pv.receiptIds?.length ? pv.receiptIds : seed.receiptIds,
                  rows: pv.rows?.length
                    ? pv.rows.map((row, idx) => ({ ...seed.rows[idx], ...row, receiptIds: row.receiptIds ?? seed.rows[idx]?.receiptIds }))
                    : seed.rows,
                };
              })
            : current.prPaymentVouchers;
        const seedScanById = Object.fromEntries(SEED_RECEIPT_SCANS.map((s) => [s.id, s]));
        const persistedScans = p?.prReceiptScans ?? [];
        const userScans = persistedScans.filter((s) => !seedScanById[s.id]);
        const mergedScans = [
          ...userScans,
          ...SEED_RECEIPT_SCANS.map((seed) => {
            const saved = persistedScans.find((s) => s.id === seed.id);
            return saved ? { ...seed, ...saved } : seed;
          }),
        ].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
        return {
          ...current,
          ...p,
          prPaymentVouchers: mergedPvs,
          prPortfolio:
            p?.prPortfolio && p.prPortfolio.length > 0
              ? [
                  ...p.prPortfolio,
                  ...Array(Math.max(0, PORTFOLIO_SLOT_COUNT - p.prPortfolio.length)).fill(null),
                ].slice(0, PORTFOLIO_SLOT_COUNT)
              : current.prPortfolio,
          prComcard: p?.prComcard ?? current.prComcard,
          prLanguages: p?.prLanguages?.length ? p.prLanguages : current.prLanguages,
          prDisplayName: p?.prDisplayName ?? current.prDisplayName,
          prPayrollAgencyId: p?.prPayrollAgencyId ?? current.prPayrollAgencyId,
          prAvatarPhoto: p?.prAvatarPhoto ?? current.prAvatarPhoto,
          prReceiptScans: mergedScans.length ? mergedScans : current.prReceiptScans,
          prActiveShift: p?.prActiveShift ?? current.prActiveShift,
          shiftHistory:
            p?.shiftHistory && p.shiftHistory.length > 0
              ? p.shiftHistory
              : current.shiftHistory,
          pendingFreelancerPayrolls: mergePendingFreelancerPayrolls(
            p?.pendingFreelancerPayrolls,
            current.pendingFreelancerPayrolls,
          ),
          agencyRoster: mergeAgencyRoster(p?.agencyRoster, current.agencyRoster),
          shifts: (p?.shifts ?? current.shifts).map(withShiftFinancialDefaults),
          outletPnl: recomputeAllOutletPnl(
            (p?.shifts ?? current.shifts).map(withShiftFinancialDefaults),
          ),
          outletPnlSyncAt: p?.outletPnlSyncAt ?? current.outletPnlSyncAt,
          outletMoneyEditCount: p?.outletMoneyEditCount ?? current.outletMoneyEditCount,
        };
      },
    }
  )
);
