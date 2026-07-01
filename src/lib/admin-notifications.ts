/** InnocenZ admin portal — pricing requests & alerts */

import type { OutletSubscriptionPlanId } from "@/lib/outlet-demo";

export type AdminNotificationKind = "pos_pricing_request";

export interface AdminNotification {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
  requestId?: string;
}

export type OutletPosPricingRequestStatus = "pending" | "contacted";

export interface OutletPosPricingRequest {
  id: string;
  outletName: string;
  contactName: string;
  contactEmail: string;
  contactMobile: string;
  currentPlanId: OutletSubscriptionPlanId;
  requestedAt: string;
  status: OutletPosPricingRequestStatus;
}

export function adminNotificationStamp(): string {
  return new Date().toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pendingOutletPosPricingRequests(
  requests: OutletPosPricingRequest[],
): OutletPosPricingRequest[] {
  return requests.filter((r) => r.status === "pending");
}

export function outletHasPendingPosPricingRequest(
  requests: OutletPosPricingRequest[],
  outletName: string,
): boolean {
  return requests.some((r) => r.outletName === outletName && r.status === "pending");
}
