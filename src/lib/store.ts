import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type PrSubRole,
  type PrPaymentVoucher,
  SEED_PR_PVS,
} from "@/lib/pr-demo";

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
  status: "pending" | "approved" | "rejected";
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
  acceptPrShift: () => void;
  approvePrShift: () => void;
  cancelPrShift: () => void;
  resetPrShift: () => void;
  prCheckIn: () => void;
  prCheckOut: () => void;
  setOutletRatingStars: (n: number) => void;

  prPaymentVouchers: PrPaymentVoucher[];
  signPrPv: (id: string) => void;
  disputePrPv: (id: string) => void;

  prs: PR[];
  shifts: ShiftRequest[];
  bookings: Booking[];
  pvs: PV[];
  walletBalance: number;
  ratings: { id: string; pr: string; stars: number; note: string; date: string }[];
  pendingPRs: PendingPR[];

  approvePendingPR: (id: string) => void;
  rejectPendingPR: (id: string) => void;

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
  {
    id: "s1", outletName: "Velvet 23", date: "Tonight", shift: "22:00 — 04:00",
    quantity: 6, filled: 6, languages: "EN / 中文", event: "Private VIP — Hennessy Launch",
    preferredRating: 4.5, estimatedCost: 2180, liveSales: 14820,
    status: "confirmed", prs: ["p1", "p2", "p3", "p4"], payPerHour: 60,
  },
];

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
  { id: "pr1", name: "Siti Rahman", languages: "EN · Malay", status: "pending" },
  { id: "pr2", name: "Chen Wei", languages: "EN · 中文", status: "pending" },
];

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
        }),

      shiftAccepted: false,
      pendingApproval: false,
      acceptedShiftIndex: null,
      checkedIn: false,
      checkedOut: false,
      drinks: 0,
      tables: 0,
      outletRatingStars: 0,

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
        });
      },
      prCheckIn: () => {
        set({ checkedIn: true });
        get().toast("Checked in ✓ selfie captured · Time-In locked", "success");
      },
      prCheckOut: () => {
        set({ checkedOut: true });
        get().toast("Checked out ✓ duration recorded · sent to agency", "success");
      },
      setOutletRatingStars: (n) => set({ outletRatingStars: n }),

      prPaymentVouchers: SEED_PR_PVS,
      signPrPv: (id) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "SIGNED" as const } : p,
          ),
        }));
        get().toast("Dual-signed ✓ — queued for weekly auto-bank-transfer", "success");
        setTimeout(() => {
          set((st) => ({
            prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
              p.id === id ? { ...p, status: "PAID" as const } : p,
            ),
          }));
          get().toast("Bank-transfer complete · status flipped Signed → PAID", "success");
        }, 2400);
      },
      disputePrPv: (id) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "DISPUTED" as const } : p,
          ),
        }));
        get().toast("Dispute raised — agency notified", "warn");
      },

      prs: seedPRs,
      shifts: seedShifts,
      bookings: seedBookings,
      pvs: seedPVs,
      walletBalance: 1240,
      ratings: [],
      pendingPRs: seedPendingPRs,

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
        bookings: s.bookings,
        pvs: s.pvs,
        walletBalance: s.walletBalance,
        ratings: s.ratings,
        pendingPRs: s.pendingPRs,
        shiftAccepted: s.shiftAccepted,
        pendingApproval: s.pendingApproval,
        acceptedShiftIndex: s.acceptedShiftIndex,
        checkedIn: s.checkedIn,
        checkedOut: s.checkedOut,
        drinks: s.drinks,
        tables: s.tables,
        prPaymentVouchers: s.prPaymentVouchers,
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
                };
              })
            : current.prPaymentVouchers;
        return {
          ...current,
          ...p,
          prPaymentVouchers: mergedPvs,
        };
      },
    }
  )
);
