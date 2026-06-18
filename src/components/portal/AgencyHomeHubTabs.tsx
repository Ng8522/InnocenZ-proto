import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LiveWorkforceTable } from "@/components/portal/LiveWorkforceTable";
import { PortalClickableTableRow } from "@/components/portal/PortalClickableTableRow";
import { IzPill, formatRM } from "@/components/iz/ui";
import { useStore } from "@/lib/store";
import { agencyCan, type AgencySubRole } from "@/lib/agency-rbac";
import { DEFAULT_TIED_AGENCY_ID, pvStatusLabel, pvStatusPillVariant } from "@/lib/pr-demo";
import { deriveLiveWorkforce } from "@/lib/portal-sync";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
type HubTab = "on-duty" | "approvals" | "review" | "disputes";

function HubPanelLink({ to, search, label }: { to: string; search?: Record<string, string>; label: string }) {  return (
    <Link to={to} search={search} className="iz-tiny flex items-center gap-0.5 text-[var(--iz-gold-l)]">
      {label} <ChevronRight className="h-3 w-3" />
    </Link>
  );
}

export function AgencyHomeHubTabs({ agencySubRole }: { agencySubRole: AgencySubRole | null }) {
  const agencyRoster = useStore((s) => s.agencyRoster);  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);
  const pendingPRs = useStore((s) => s.pendingPRs);
  const pendingFreelancerPayrolls = useStore((s) => s.pendingFreelancerPayrolls);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);

  const showWorkforce = agencyCan(agencySubRole, "viewWorkforce");
  const showApprovals = agencyCan(agencySubRole, "approvePrSignups");
  const showPayroll = agencyCan(agencySubRole, "viewPv");

  const tabs = useMemo(() => {
    const list: { id: HubTab; label: string }[] = [];
    if (showWorkforce) list.push({ id: "on-duty", label: "PR ON DUTY" });
    if (showApprovals) list.push({ id: "approvals", label: "PENDING APPROVALS" });
    if (showPayroll) {
      list.push({ id: "review", label: "PENDING REVIEW" });
      list.push({ id: "disputes", label: "DISPUTES" });
    }
    return list;
  }, [showWorkforce, showApprovals, showPayroll]);

  const defaultTab = tabs[0]?.id ?? "on-duty";
  const [tab, setTab] = useState<HubTab>(defaultTab);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : defaultTab;

  const workforce = useMemo(
    () => deriveLiveWorkforce(agencyRoster, DEFAULT_ROSTER_DATE_ISO, outletCommissionRules, perDrinkRm),
    [agencyRoster, outletCommissionRules, perDrinkRm],
  );

  const signups = pendingPRs.filter((p) => p.status === "pending");
  const freelancers = pendingFreelancerPayrolls.filter(
    (p) => p.agencyId === DEFAULT_TIED_AGENCY_ID && p.status === "pending",
  );
  const pendingReview = prPaymentVouchers.filter((p) => p.status === "PENDING_REVIEW");
  const disputes = prPaymentVouchers.filter((p) => p.status === "DISPUTED");

  const counts: Record<HubTab, number> = {
    "on-duty": workforce.length,
    approvals: signups.length + freelancers.length,
    review: pendingReview.length,
    disputes: disputes.length,
  };

  if (tabs.length === 0) return null;

  return (
    <div className="mt-3">
      <div
        className="iz-agency-home-tabs"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`iz-agency-home-tab${activeTab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <div className="l">{t.label}</div>
            <div
              className={`n${
                t.id === "approvals" && counts.approvals
                  ? " text-[var(--iz-amber)]"
                  : t.id === "on-duty" && counts["on-duty"]
                    ? " text-[var(--iz-green)]"
                    : t.id === "disputes" && counts.disputes
                      ? " text-[var(--iz-red)]"
                      : t.id === "review" && counts.review
                        ? " text-[var(--iz-amber)]"
                        : ""
              }`}
            >
              {counts[t.id]}
            </div>
          </button>
        ))}
      </div>

      {activeTab === "on-duty" && showWorkforce && (
        <LiveWorkforceTable linkPrProfiles className="!mt-3" />
      )}

      {activeTab === "approvals" && showApprovals && (
        <section className="iz-portal-panel mt-3">
          <div className="iz-portal-panel-head">
            <h3 className="font-sora text-base font-bold">Pending approvals</h3>
            <HubPanelLink to="/agency/pending" label="Open approvals" />
          </div>
          {signups.length + freelancers.length === 0 ? (
            <p className="iz-tiny iz-muted px-4 py-6 text-center">Nothing awaiting approval.</p>
          ) : (
            <div className="iz-portal-table-wrap">
              <table className="iz-portal-table">
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>Type</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((p) => (
                    <PortalClickableTableRow key={p.id} target={{ to: "/agency/pending" }}>
                      <td>
                        <div className="iz-portal-table-pr">
                          <span className="iz-portal-table-av">{p.name.trim()[0]}</span>
                          <span className="iz-portal-table-name">{p.name}</span>
                        </div>
                      </td>
                      <td className="iz-portal-table-meta">New signup</td>
                      <td className="iz-portal-table-meta">{p.languages || p.mobile}</td>
                    </PortalClickableTableRow>
                  ))}
                  {freelancers.map((p) => (
                    <PortalClickableTableRow
                      key={p.id}
                      target={
                        p.prId
                          ? { to: "/agency/prs", search: { pr: p.prId } }
                          : { to: "/agency/pending", search: { tab: "freelancer" } }
                      }
                    >
                      <td>
                        <div className="iz-portal-table-pr">
                          <span className="iz-portal-table-av">{p.prName.trim()[0]}</span>
                          <span className="iz-portal-table-name">{p.prName}</span>
                        </div>
                      </td>
                      <td className="iz-portal-table-meta">Freelancer payroll</td>
                      <td className="iz-portal-table-meta">{p.agencyName}</td>
                    </PortalClickableTableRow>
                  ))}                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "review" && showPayroll && (
        <section className="iz-portal-panel mt-3">
          <div className="iz-portal-panel-head">
            <h3 className="font-sora text-base font-bold">PV pending review</h3>
            <HubPanelLink to="/agency/pv" search={{ status: "PENDING_REVIEW" }} label="Open payroll" />
          </div>
          {pendingReview.length === 0 ? (
            <p className="iz-tiny iz-muted px-4 py-6 text-center">No PVs awaiting review.</p>
          ) : (
            <div className="iz-portal-table-wrap">
              <table className="iz-portal-table">
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>Outlet</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReview.map((pv) => (
                    <PortalClickableTableRow
                      key={pv.id}
                      target={{ to: "/agency/pv", search: { pv: pv.id, status: "PENDING_REVIEW" } }}
                    >
                      <td>
                        <div className="iz-portal-table-pr">
                          <span className="iz-portal-table-av">{pv.prName.trim()[0]}</span>
                          <span className="iz-portal-table-name">{pv.prName}</span>
                        </div>
                      </td>
                      <td className="iz-portal-table-meta">{pv.outlet}</td>
                      <td className="iz-portal-table-meta">{formatRM(pv.net)}</td>
                      <td className="iz-portal-table-status">
                        <IzPill variant={pvStatusPillVariant(pv.status)} className="!py-0.5 !text-[9px]">
                          {pvStatusLabel(pv.status)}
                        </IzPill>
                      </td>
                    </PortalClickableTableRow>
                  ))}                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "disputes" && showPayroll && (
        <section className="iz-portal-panel mt-3">
          <div className="iz-portal-panel-head">
            <h3 className="font-sora text-base font-bold">Disputed PVs</h3>
            <HubPanelLink to="/agency/pv" search={{ status: "DISPUTED" }} label="Open payroll" />
          </div>
          {disputes.length === 0 ? (
            <p className="iz-tiny iz-muted px-4 py-6 text-center">No open disputes.</p>
          ) : (
            <div className="iz-portal-table-wrap">
              <table className="iz-portal-table">
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>Outlet</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((pv) => (
                    <PortalClickableTableRow
                      key={pv.id}
                      target={{ to: "/agency/pv", search: { pv: pv.id, status: "DISPUTED" } }}
                    >
                      <td>
                        <div className="iz-portal-table-pr">
                          <span className="iz-portal-table-av">{pv.prName.trim()[0]}</span>
                          <span className="iz-portal-table-name">{pv.prName}</span>
                        </div>
                      </td>
                      <td className="iz-portal-table-meta">{pv.outlet}</td>
                      <td className="iz-portal-table-meta">{formatRM(pv.net)}</td>
                      <td className="iz-portal-table-status">
                        <IzPill variant={pvStatusPillVariant(pv.status)} className="!py-0.5 !text-[9px]">
                          {pvStatusLabel(pv.status)}
                        </IzPill>
                      </td>
                    </PortalClickableTableRow>
                  ))}                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
