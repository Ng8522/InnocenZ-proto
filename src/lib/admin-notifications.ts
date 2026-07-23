/** InnocenZ admin portal notifications (hidden ops console) */

import type { OutletSubscriptionPlanId } from "@/lib/outlet-demo";

export type AdminNotificationKind = "pos_integration_quote" | "pr_shift_cancel";

export interface AdminNotification {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
  requestId?: string;
  outlet: string;
  contactLine?: string;
}

export type PosIntegrationQuoteRequestStatus = "pending" | "contacted";

export interface PosIntegrationQuoteRequest {
  id: string;
  outlet: string;
  ownerName: string;
  email: string;
  mobile: string;
  currentPlanId: OutletSubscriptionPlanId;
  at: string;
  status: PosIntegrationQuoteRequestStatus;
}

export function buildPosIntegrationAdminNotification(
  req: PosIntegrationQuoteRequest,
): AdminNotification {
  const contact = [req.ownerName, req.email || req.mobile].filter(Boolean).join(" · ");
  return {
    id: `admin-pos-${req.id}`,
    kind: "pos_integration_quote",
    title: "POS integration quote",
    body: `${req.outlet} requested POS sync pricing`,
    at: req.at,
    read: false,
    href: "/admin/subscriptions",
    requestId: req.id,
    outlet: req.outlet,
    contactLine: contact,
  };
}

export function buildPrShiftCancelAdminNotification(args: {
  prName: string;
  outlet: string;
  dateLabel: string;
  deductionRm: number;
  reason: string;
  at: string;
}): AdminNotification {
  const penalty = args.deductionRm > 0 ? ` · −RM ${args.deductionRm} penalty` : " · no penalty";
  return {
    id: `admin-cancel-${Date.now().toString(36)}`,
    kind: "pr_shift_cancel",
    title: "PR cancelled a shift",
    body: `${args.prName} cancelled ${args.outlet} · ${args.dateLabel}${penalty}`,
    at: args.at,
    read: false,
    href: "/admin/jobs",
    outlet: args.outlet,
    contactLine: args.reason ? `Reason: ${args.reason}` : undefined,
  };
}

export function adminNotificationKindLabel(kind: AdminNotificationKind): string {
  if (kind === "pos_integration_quote") return "POS integration";
  if (kind === "pr_shift_cancel") return "Shift cancellation";
  return "Admin alert";
}

export function pendingPosIntegrationQuoteRequests(
  requests: PosIntegrationQuoteRequest[],
): PosIntegrationQuoteRequest[] {
  return requests.filter((r) => r.status === "pending");
}
