import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import {
  OUTLET_COMMISSION_RULES,
  OUTLET_NAMES,
  nowAgencyDateTime,
} from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { deriveAgencyPnlMetrics, formatSyncTime, roundRm } from "@/lib/outlet-financial-sync";
import { computeAgencyNoShowRate, pnlForDateRange } from "@/lib/agency-actions";
import { AgencyPnlChart } from "@/components/agency/AgencyPnlChart";
import { IzCard, IzPill, IzSelect, formatRM } from "@/components/iz/ui";
import { Download, Filter, RefreshCw } from "lucide-react";

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
  const shiftHistory = useStore((s) => s.shiftHistory);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const pushNotify = useStore((s) => s.pushNotify);
  const [outletFilter, setOutletFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-06-01");
  const [dateTo, setDateTo] = useState("2026-06-04");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [quickTab, setQuickTab] = useState<QuickTab>("outlet");

  const pnlRows = useMemo(() => {
    const ranged = pnlForDateRange(outletPnl, shiftHistory, dateFrom, dateTo);
    const base = ranged.length > 0 ? ranged : outletPnl;
    if (!outletFilter) return base;
    return base.filter((r) => r.outlet === outletFilter);
  }, [outletPnl, outletFilter, shiftHistory, dateFrom, dateTo]);

  const totals = pnlRows.reduce(
    (acc, r) => {
      const m = deriveAgencyPnlMetrics(r);
      return {
        gross: acc.gross + m.grossRevenue,
        earned: acc.earned + m.earned,
        spent: acc.spent + m.spent,
        profit: acc.profit + m.profit,
        outletNet: acc.outletNet + m.outletNet,
      };
    },
    { gross: 0, earned: 0, spent: 0, profit: 0, outletNet: 0 },
  );

  const liveShift = shifts.find((s) => s.date === "Tonight");
  const noShowRate = computeAgencyNoShowRate(agencyPRs);
  const canExport = agencyCan(agencySubRole, "exportReports");
  const forecast = viewMode === "planning" ? 1.12 : 1;
  const earnedDisplay = roundRm(totals.earned * forecast);
  const spentDisplay = roundRm(totals.spent * forecast);
  const agencyNetDisplay = roundRm(earnedDisplay - spentDisplay);
  const agencyProfited = agencyNetDisplay >= 0;

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Analytics</h2>
        <p className="iz-tiny iz-muted mt-0.5">
          {date} · {time}
        </p>
      </header>

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
          className={`flex-1 rounded-full border py-1.5 text-[11px] font-semibold ${quickTab === "workforce" ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
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

      <div className="iz-grid3 mt-3">
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-green)]">{formatRM(earnedDisplay)}</div>
          <div className="l">Earned income {viewMode === "planning" ? "· proj." : ""}</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-red)]">{formatRM(spentDisplay)}</div>
          <div className="l">Spent income {viewMode === "planning" ? "· proj." : ""}</div>
        </div>
        <div className="iz-stat-tile">
          <div
            className={`n ${agencyProfited ? "text-[var(--iz-green)]" : "text-[var(--iz-red)]"}`}
          >
            {agencyProfited ? "" : "−"}
            {formatRM(Math.abs(agencyNetDisplay))}
          </div>
          <div className="l">
            {agencyProfited ? "Agency profit" : "Agency loss"}
            {viewMode === "planning" ? " · proj." : ""}
          </div>
        </div>
      </div>

      {quickTab === "outlet" && (
        <AgencyPnlChart
          shiftHistory={shiftHistory}
          pnlRows={pnlRows}
          dateFrom={dateFrom}
          dateTo={dateTo}
          outletFilter={outletFilter}
          forecast={forecast}
        />
      )}

      {quickTab === "outlet" ? (
        <>
          <OutletSection title="PNL" hint="Earned · spent · profit / loss per outlet">
            <div className="space-y-2">
            {pnlRows.map((r) => {
              const rowForecast = viewMode === "planning" ? 1.12 : 1;
              const m = deriveAgencyPnlMetrics(r);
              const earned = roundRm(m.earned * rowForecast);
              const spent = roundRm(m.spent * rowForecast);
              const net = roundRm(earned - spent);
              const profited = net >= 0;
              const grossDisplay = roundRm(
                m.grossRevenue * (viewMode === "planning" ? 1.1 : 1),
              );
              return (
              <IzCard key={r.outlet}>
                <div className="iz-between">
                  <div className="font-sora text-sm font-bold">{r.outlet}</div>
                  <div className="flex items-center gap-1.5">
                    {viewMode === "live" && r.syncedFromOutlet && <IzPill variant="green">Live</IzPill>}
                    {viewMode === "planning" && <IzPill variant="gold">Planning</IzPill>}
                    <IzPill variant={profited ? "green" : "red"}>{profited ? "Profit" : "Loss"}</IzPill>
                  </div>
                </div>
                <div className="iz-v-sum mt-2">
                  <span className="iz-muted">Earned income · collected from outlet</span>
                  <b className="text-[var(--iz-green)]">{formatRM(earned)}</b>
                </div>
                <div className="iz-v-sum">
                  <span className="iz-muted">Spent income · PR payout + platform</span>
                  <b className="text-[var(--iz-red)]">−{formatRM(spent)}</b>
                </div>
                <div className="iz-v-sum tot">
                  <span>{profited ? "Agency profit" : "Agency loss"}</span>
                  <b className={profited ? "text-[var(--iz-green)]" : "text-[var(--iz-red)]"}>
                    {profited ? "" : "−"}
                    {formatRM(Math.abs(net))}
                  </b>
                </div>
                <div className="iz-v-sum mt-1 border-t border-[var(--iz-line)] pt-2">
                  <span className="iz-muted">Gross revenue (outlet sales)</span>
                  <b>{formatRM(grossDisplay)}</b>
                </div>
                <div className="iz-v-sum">
                  <span className="iz-muted">Outlet net</span>
                  <b>{formatRM(roundRm(m.outletNet * rowForecast))}</b>
                </div>
              </IzCard>
            );
            })}
            </div>
          </OutletSection>
        </>
      ) : (
        <>
          <div className="iz-grid2 mt-1">
            <div className="iz-stat-tile">
              <div className="n">{noShowRate}%</div>
              <div className="l">No-show rate</div>
            </div>
            <div className="iz-stat-tile">
              <div className="n">{agencyPRs.length}</div>
              <div className="l">PRs on roster</div>
            </div>
          </div>
          <OutletSection title="Per-PR performance" hint={`${Math.min(agencyPRs.length, 6)} listed`}>
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
          </OutletSection>
        </>
      )}

      {canExport && (
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-3 w-full"
          onClick={() => {
            pushNotify({
              type: "report_ready",
              portal: "agency",
              label: `PNL report · ${dateFrom} – ${dateTo}`,
            });
            toast("PNL report.xlsx downloaded", "success");
          }}
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
