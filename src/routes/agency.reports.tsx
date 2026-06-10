import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  OUTLET_COMMISSION_RULES,
  OUTLET_NAMES,
  nowAgencyDateTime,
} from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { formatSyncTime } from "@/lib/outlet-financial-sync";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";
import { Download, Filter, RefreshCw, Users } from "lucide-react";

export const Route = createFileRoute("/agency/reports")({
  component: AgencyReports,
});

type ViewMode = "live" | "planning";
type QuickTab = "outlet" | "workforce";

function AgencyReports() {
  const { date, time } = nowAgencyDateTime();
  const outletPnl = useStore((s) => s.outletPnl);
  const outletPnlSyncAt = useStore((s) => s.outletPnlSyncAt);
  const outletMoneyEditCount = useStore((s) => s.outletMoneyEditCount);
  const shifts = useStore((s) => s.shifts);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const [outletFilter, setOutletFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-06-01");
  const [dateTo, setDateTo] = useState("2026-06-04");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [quickTab, setQuickTab] = useState<QuickTab>("outlet");

  const pnlRows = useMemo(() => {
    if (!outletFilter) return outletPnl;
    return outletPnl.filter((r) => r.outlet === outletFilter);
  }, [outletPnl, outletFilter]);

  const totals = pnlRows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossRevenue,
      prPayout: acc.prPayout + r.prPayout,
      agencyNet: acc.agencyNet + r.agencyNet,
      outletNet: acc.outletNet + r.outletNet,
    }),
    { gross: 0, prPayout: 0, agencyNet: 0, outletNet: 0 },
  );

  const liveShift = shifts.find((s) => s.date === "Tonight");
  const noShowRate = 4.2;
  const canExport = agencyCan(agencySubRole, "exportReports");
  const agencyNetDisplay = viewMode === "planning" ? totals.agencyNet * 1.12 : totals.agencyNet;

  return (
    <div className="iz-screen">
      <AppHeader subtitle={`Module 6 · ${date} · ${time}`} title="Agency analytics" />

      <IzCard flat>
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Filter className="h-3.5 w-3.5" /> Filter outlet payment · date range
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <IzSelect value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)}>
            <option value="">All outlets</option>
            {OUTLET_NAMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </IzSelect>
          <input
            type="date"
            className="iz-select iz-date-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="iz-tiny iz-muted self-center">—</span>
          <input
            type="date"
            className="iz-select iz-date-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </IzCard>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-xs font-semibold ${viewMode === "live" ? "border-[var(--iz-green)] bg-[rgba(57,217,138,.12)] text-[var(--iz-green)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setViewMode("live")}
        >
          Live · today
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-xs font-semibold ${viewMode === "planning" ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setViewMode("planning")}
        >
          Planning · forecast
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full border py-1.5 text-[11px] font-semibold ${quickTab === "outlet" ? "border-[var(--iz-gold)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setQuickTab("outlet")}
        >
          Outlet PNL
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border py-1.5 text-[11px] font-semibold ${quickTab === "workforce" ? "border-[var(--iz-violet)] text-[var(--iz-violet)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setQuickTab("workforce")}
        >
          Workforce
        </button>
      </div>

      <IzCard flat className="mt-2 border-[rgba(124,107,255,.25)]">
        <div className="flex items-start gap-2">
          <RefreshCw
            className={`mt-0.5 h-4 w-4 shrink-0 ${outletMoneyEditCount > 0 ? "text-[var(--iz-green)]" : "text-[var(--iz-muted2)]"}`}
          />
          <div>
            <p className="iz-tiny iz-muted">
              Changes from outlet Home sync here instantly. Gross revenue, PR commission (payroll/PV), agency net
              &amp; outlet net recalc on every per-drink / per-table edit.
            </p>
            {outletMoneyEditCount > 0 && (
              <p className="iz-tiny text-[var(--iz-green)] mt-1">
                Last update {formatSyncTime(outletPnlSyncAt)}
                {liveShift && ` · ${liveShift.outletName} floor RM ${liveShift.liveSales.toLocaleString()}`}
              </p>
            )}
          </div>
        </div>
      </IzCard>

      <div className="iz-grid2 mt-3">
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-green)]">{formatRM(agencyNetDisplay)}</div>
          <div className="l">Agency net (PNL) {viewMode === "planning" ? "· proj." : ""}</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n">{noShowRate}%</div>
          <div className="l">No-show rate</div>
        </div>
      </div>

      {quickTab === "outlet" ? (
        <>
          <IzSectionLabel>PNL · outlet ↔ agency ↔ PR</IzSectionLabel>
          <div className="space-y-2">
            {pnlRows.map((r) => (
              <IzCard key={r.outlet}>
                <div className="iz-between">
                  <div className="font-sora text-sm font-bold">{r.outlet}</div>
                  {viewMode === "live" && r.syncedFromOutlet && <IzPill variant="green">Live</IzPill>}
                  {viewMode === "planning" && <IzPill variant="gold">Planning</IzPill>}
                </div>
                <div className="iz-v-sum mt-2">
                  <span className="iz-muted">Gross revenue (outlet sales)</span>
                  <b>{formatRM(viewMode === "planning" ? r.grossRevenue * 1.1 : r.grossRevenue)}</b>
                </div>
                <div className="iz-v-sum">
                  <span className="iz-muted">PR payout · wages + commission</span>
                  <b className="text-[var(--iz-red)]">−{formatRM(r.prPayout)}</b>
                </div>
                <div className="iz-v-sum">
                  <span className="iz-muted">Agency net</span>
                  <b className="text-[var(--iz-green)]">{formatRM(r.agencyNet)}</b>
                </div>
                <div className="iz-v-sum tot">
                  <span>Outlet net</span>
                  <b>{formatRM(r.outletNet)}</b>
                </div>
              </IzCard>
            ))}
          </div>
        </>
      ) : (
        <>
          <IzSectionLabel>
            <Users className="mr-1 inline h-3.5 w-3.5" />
            Per-PR performance
          </IzSectionLabel>
          <div className="space-y-2">
            {agencyPRs.slice(0, 6).map((pr) => (
              <IzCard key={pr.id} flat>
                <div className="iz-between">
                  <span className="font-sora text-sm font-bold">{pr.name}</span>
                  <IzPill variant="gold">{pr.rating} ★</IzPill>
                </div>
                <p className="iz-tiny iz-muted mt-1">
                  {pr.checkIns} shifts · KPI {pr.kpiScore} · No-shows {pr.noShows} · Paid {formatRM(pr.totalPaid)}
                </p>
              </IzCard>
            ))}
          </div>
        </>
      )}

      {canExport && (
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-3 w-full"
          onClick={() => toast("PNL report.xlsx downloaded", "success")}
        >
          <Download className="h-4 w-4" /> Download Excel PNL report
        </button>
      )}

      <IzCard flat className="mt-2">
        <p className="iz-tiny iz-muted">Scheduled auto-emailed reports</p>
        <p className="iz-tiny iz-muted2 mt-1">15th · 28th (Feb last day) · month-end</p>
      </IzCard>

      <Link to="/agency/history" className="iz-btn iz-btn-soft mt-3 block text-center">
        View shift history · payout · drinks · tips
      </Link>
    </div>
  );
}
