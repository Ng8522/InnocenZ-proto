import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "vendor" | "host" | "agency" | "admin";

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
  user: { name: string; email: string } | null;
  setRole: (r: Role | null) => void;
  signIn: (name: string, email: string) => void;
  signOut: () => void;

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
      user: null,
      setRole: (r) => set({ role: r }),
      signIn: (name, email) => set({ user: { name, email } }),
      signOut: () => set({ user: null, role: null }),

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
        role: s.role, user: s.user, shifts: s.shifts, bookings: s.bookings,
        pvs: s.pvs, walletBalance: s.walletBalance, ratings: s.ratings, pendingPRs: s.pendingPRs,
      }),
    }
  )
);
