/** InnocenZ admin portal notifications (hidden ops console) */

export type AdminNotificationKind = "pos_integration_quote";

export interface AdminNotification {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  outlet: string;
  contactLine?: string;
}

export interface PosIntegrationQuoteRequest {
  id: string;
  outlet: string;
  ownerName: string;
  email: string;
  mobile: string;
  at: string;
  status: "pending";
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
    outlet: req.outlet,
    contactLine: contact,
  };
}

export function adminNotificationKindLabel(kind: AdminNotificationKind): string {
  if (kind === "pos_integration_quote") return "POS integration";
  return "Admin alert";
}
