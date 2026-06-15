/**
 * Cross-role in-app push notifications (X.4) — PR, Agency, Outlet.
 * Prototype: Zustand store delivery + bell UI deep-links (no FCM/APNS).
 */

import type { PrNotification } from "@/lib/pr-features";
import type { OpsNotification, OpsPortal, SosIncident } from "@/lib/ops-notifications";

export type PushEventType =
  | "shift_assigned"
  | "shift_edit"
  | "swap_update"
  | "check_in"
  | "sos"
  | "pv_ready"
  | "pv_sent"
  | "pv_signed"
  | "pv_paid"
  | "dispute_raised"
  | "rating_prompt"
  | "reconciliation_due"
  | "report_ready";

export type PushAudience = "pr" | "agency" | "outlet";

/** Per-role toggles — all on by default in demo */
export type NotificationPrefs = Record<PushEventType, Record<PushAudience, boolean>>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  shift_assigned: { pr: true, agency: true, outlet: false },
  shift_edit: { pr: true, agency: true, outlet: false },
  swap_update: { pr: true, agency: true, outlet: false },
  check_in: { pr: false, agency: true, outlet: true },
  sos: { pr: true, agency: true, outlet: true },
  pv_ready: { pr: true, agency: true, outlet: false },
  pv_sent: { pr: true, agency: false, outlet: false },
  pv_signed: { pr: true, agency: true, outlet: false },
  pv_paid: { pr: true, agency: true, outlet: false },
  dispute_raised: { pr: true, agency: true, outlet: true },
  rating_prompt: { pr: true, agency: false, outlet: true },
  reconciliation_due: { pr: false, agency: true, outlet: true },
  report_ready: { pr: false, agency: true, outlet: true },
};

export function notificationStamp(): string {
  return new Date().toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export type PushEvent =
  | { type: "shift_assigned"; prId: string; prName: string; outlet: string }
  | { type: "shift_edit"; prId: string; prName: string; outlet: string; detail: string }
  | {
      type: "swap_update";
      prId?: string;
      prName: string;
      outlet: string;
      status: "pending" | "approved" | "declined";
      notifyPr?: boolean;
      notifyAgency?: boolean;
    }
  | { type: "check_in"; prId: string; prName: string; outlet: string; late?: boolean }
  | { type: "sos"; incident: SosIncident }
  | { type: "pv_ready"; pvId: string; prId: string; prName: string; net: number; outlet: string }
  | { type: "pv_sent"; pvId: string; prId: string; prName: string; net: number }
  | { type: "pv_signed"; pvId: string; prName: string; net: number }
  | { type: "pv_paid"; pvId: string; prId: string; prName: string; net: number }
  | { type: "dispute_raised"; pvId: string; prName: string; outlet: string }
  | { type: "rating_prompt"; prId?: string; prName: string; outlet: string; audience: "pr" | "outlet" }
  | { type: "reconciliation_due"; outlet: string }
  | { type: "report_ready"; portal: OpsPortal; label: string };

export interface PushNotifyInput {
  prNotifications: PrNotification[];
  opsNotifications: OpsNotification[];
  notificationPrefs: NotificationPrefs;
}

export interface PushNotifyResult {
  prNotifications: PrNotification[];
  opsNotifications: OpsNotification[];
}

function prefOn(prefs: NotificationPrefs, type: PushEventType, audience: PushAudience): boolean {
  return prefs[type]?.[audience] ?? true;
}

function prependPr(n: PrNotification, list: PrNotification[]): PrNotification[] {
  return [n, ...list];
}

function prependOps(n: OpsNotification, list: OpsNotification[]): OpsNotification[] {
  return [n, ...list];
}

function rm(amount: number) {
  return amount.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

/** Apply one push event → updated notification arrays */
export function applyPushEvent(
  state: PushNotifyInput,
  event: PushEvent,
): PushNotifyResult {
  const at = notificationStamp();
  const prefs = state.notificationPrefs;
  let prNotifications = state.prNotifications;
  let opsNotifications = state.opsNotifications;

  switch (event.type) {
    case "shift_assigned": {
      if (prefOn(prefs, "shift_assigned", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-assign"),
            kind: "assignment",
            title: "Shift assigned",
            body: `${event.outlet} — confirm on Shifts home`,
            at,
            read: false,
            prId: event.prId,
            href: "/host",
          },
          prNotifications,
        );
      }
      if (prefOn(prefs, "shift_assigned", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-assign"),
            portal: "agency",
            kind: "shift_assigned",
            title: `Assignment · ${event.prName}`,
            body: `Shift at ${event.outlet} — awaiting PR confirm`,
            at,
            read: false,
            href: "/agency/roster",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "shift_edit": {
      if (prefOn(prefs, "shift_edit", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-edit"),
            kind: "assignment",
            title: "Shift updated",
            body: `${event.outlet}: ${event.detail}`,
            at,
            read: false,
            prId: event.prId,
            href: "/host",
          },
          prNotifications,
        );
      }
      if (prefOn(prefs, "shift_edit", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-edit"),
            portal: "agency",
            kind: "shift_edit",
            title: `Roster edit · ${event.prName}`,
            body: `${event.outlet}: ${event.detail}`,
            at,
            read: false,
            href: "/agency/roster",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "swap_update": {
      const statusLabel =
        event.status === "approved" ? "approved" : event.status === "declined" ? "declined" : "pending";
      if (event.notifyPr !== false && prefOn(prefs, "swap_update", "pr") && event.prId) {
        prNotifications = prependPr(
          {
            id: nid("n-swap"),
            kind: "swap",
            title: `Swap ${statusLabel}`,
            body: `${event.outlet} — ${event.prName}`,
            at,
            read: false,
            prId: event.prId,
            href: "/host",
          },
          prNotifications,
        );
      }
      if (event.notifyAgency !== false && prefOn(prefs, "swap_update", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-swap"),
            portal: "agency",
            kind: "swap_update",
            title: `Swap ${statusLabel}`,
            body: `${event.prName} · ${event.outlet}`,
            at,
            read: false,
            href: "/agency/roster",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "check_in": {
      const body = `${event.prName} checked in${event.late ? " (late)" : ""}`;
      if (prefOn(prefs, "check_in", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-checkin"),
            portal: "agency",
            kind: "check_in",
            title: "Check-in confirmed",
            body: `${body} · ${event.outlet}`,
            at,
            read: false,
            href: "/agency/roster",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      if (prefOn(prefs, "check_in", "outlet")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-checkin-out"),
            portal: "outlet",
            kind: "check_in",
            title: "PR on floor",
            body: body,
            at,
            read: false,
            href: "/outlet",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "sos": {
      const { incident } = event;
      const typeLabel = incident.prType === "freelancer" ? "Freelancer" : "Agency-tied";
      if (prefOn(prefs, "sos", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-sos"),
            kind: "sos",
            title: "SOS sent",
            body: incident.note.slice(0, 80),
            at,
            read: true,
            prId: incident.prId,
          },
          prNotifications,
        );
      }
      if (prefOn(prefs, "sos", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-sos-ag"),
            portal: "agency",
            kind: "sos",
            title: `SOS · ${incident.prName}`,
            body: `${typeLabel} at ${incident.outlet} — ${incident.note.slice(0, 100)}`,
            at,
            read: false,
            href: "/agency/roster",
            sosId: incident.id,
            prName: incident.prName,
            prType: incident.prType,
            outlet: incident.outlet,
          },
          opsNotifications,
        );
      }
      if (prefOn(prefs, "sos", "outlet")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-sos-out"),
            portal: "outlet",
            kind: "sos",
            title: `SOS · ${incident.prName}`,
            body: `Duty manager alert — ${incident.note.slice(0, 100)}`,
            at,
            read: false,
            href: "/outlet",
            sosId: incident.id,
            prName: incident.prName,
            prType: incident.prType,
            outlet: incident.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "pv_ready":
    case "pv_sent": {
      const title = event.type === "pv_sent" ? "PV ready for review" : "Shift PV generated";
      if (prefOn(prefs, event.type === "pv_sent" ? "pv_sent" : "pv_ready", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-pv"),
            kind: "pv",
            title,
            body: `${event.pvId} · ${rm(event.net)} net — Finance Head pre-signed`,
            at,
            read: false,
            prId: event.prId,
            pvId: event.pvId,
            href: "/host/PaymentVoucher",
          },
          prNotifications,
        );
      }
      if (event.type === "pv_ready" && prefOn(prefs, "pv_ready", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-pv"),
            portal: "agency",
            kind: "pv_ready",
            title: `PV raised · ${event.prName}`,
            body: `${event.pvId} · ${event.outlet} · ${rm(event.net)}`,
            at,
            read: false,
            href: "/agency/pv",
            pvId: event.pvId,
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "pv_signed": {
      if (prefOn(prefs, "pv_signed", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-pv-sign"),
            portal: "agency",
            kind: "pv_signed",
            title: `PR signed · ${event.prName}`,
            body: `${event.pvId} · ${rm(event.net)} — queued for Friday transfer`,
            at,
            read: false,
            href: "/agency/pv",
            pvId: event.pvId,
            prName: event.prName,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "pv_paid": {
      if (prefOn(prefs, "pv_paid", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-paid"),
            kind: "pv",
            title: "Payment received",
            body: `${event.pvId} · ${rm(event.net)} in your bank`,
            at,
            read: false,
            prId: event.prId,
            pvId: event.pvId,
            href: "/host/PaymentVoucher",
          },
          prNotifications,
        );
      }
      if (prefOn(prefs, "pv_paid", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-paid"),
            portal: "agency",
            kind: "pv_paid",
            title: `Paid · ${event.prName}`,
            body: `${event.pvId} · ${rm(event.net)} transferred`,
            at,
            read: false,
            href: "/agency/pv",
            pvId: event.pvId,
            prName: event.prName,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "dispute_raised": {
      if (prefOn(prefs, "dispute_raised", "pr")) {
        prNotifications = prependPr(
          {
            id: nid("n-dispute"),
            kind: "pv",
            title: "Dispute submitted",
            body: `${event.pvId} held — agency verifying with ${event.outlet}`,
            at,
            read: true,
            pvId: event.pvId,
            href: "/host/PaymentVoucher",
          },
          prNotifications,
        );
      }
      if (prefOn(prefs, "dispute_raised", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-dispute"),
            portal: "agency",
            kind: "dispute_raised",
            title: `Dispute · ${event.prName}`,
            body: `${event.pvId} at ${event.outlet} — 7 days to resolve`,
            at,
            read: false,
            href: "/agency/pv",
            pvId: event.pvId,
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      if (prefOn(prefs, "dispute_raised", "outlet")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-dispute-out"),
            portal: "outlet",
            kind: "dispute_raised",
            title: `PV dispute · ${event.prName}`,
            body: `${event.pvId} — agency may contact you to verify`,
            at,
            read: false,
            href: "/outlet/billing",
            pvId: event.pvId,
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "rating_prompt": {
      if (event.audience === "pr" && prefOn(prefs, "rating_prompt", "pr") && event.prId) {
        prNotifications = prependPr(
          {
            id: nid("n-rate"),
            kind: "rating",
            title: `Rate ${event.outlet}`,
            body: "Mutual rating window — 24h after shift",
            at,
            read: false,
            prId: event.prId,
            href: "/host/profile",
          },
          prNotifications,
        );
      }
      if (event.audience === "outlet" && prefOn(prefs, "rating_prompt", "outlet")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-rate"),
            portal: "outlet",
            kind: "rating_prompt",
            title: "Rate your PRs",
            body: `${event.prName} · ${event.outlet} — post-seal window`,
            at,
            read: false,
            href: "/outlet/ratings",
            prName: event.prName,
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "reconciliation_due": {
      if (prefOn(prefs, "reconciliation_due", "agency")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-recon-ag"),
            portal: "agency",
            kind: "reconciliation_due",
            title: "Reconciliation due",
            body: `Confirm today's figures vs ${event.outlet} sales`,
            at,
            read: false,
            href: "/agency/pv",
          },
          opsNotifications,
        );
      }
      if (prefOn(prefs, "reconciliation_due", "outlet")) {
        opsNotifications = prependOps(
          {
            id: nid("ops-recon-out"),
            portal: "outlet",
            kind: "reconciliation_due",
            title: "End-of-day reconciliation",
            body: "Review sealed totals vs live sales",
            at,
            read: false,
            href: "/outlet",
            outlet: event.outlet,
          },
          opsNotifications,
        );
      }
      break;
    }
    case "report_ready": {
      if (prefOn(prefs, "report_ready", event.portal)) {
        opsNotifications = prependOps(
          {
            id: nid("ops-report"),
            portal: event.portal,
            kind: "report_ready",
            title: "Report ready",
            body: event.label,
            at,
            read: false,
            href: event.portal === "agency" ? "/agency/reports" : "/outlet/billing",
          },
          opsNotifications,
        );
      }
      break;
    }
  }

  return { prNotifications, opsNotifications };
}

export const OPS_KIND_LABEL: Record<OpsNotification["kind"], string> = {
  sos: "SOS",
  shift_assigned: "Assignment",
  shift_edit: "Roster",
  swap_update: "Swap",
  check_in: "Check-in",
  pv_ready: "PV",
  pv_signed: "PV signed",
  pv_paid: "Paid",
  dispute_raised: "Dispute",
  rating_prompt: "Rating",
  reconciliation_due: "Reconciliation",
  report_ready: "Report",
};

export function isUrgentOpsKind(kind: OpsNotification["kind"]): boolean {
  return kind === "sos" || kind === "dispute_raised";
}
