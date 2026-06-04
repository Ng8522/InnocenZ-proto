import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  OUTLET_COMMISSION_RULES,
  OUTLET_NAMES,
  nowAgencyDateTime,
} from "@/lib/agency-demo";
import { formatSyncTime } from "@/lib/outlet-financial-sync";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";
import { Filter, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/agency/reports")({
  component: AgencyReports,
});

function AgencyReports() {
  const { date, time } = nowAgencyDateTime();
  const outletPnl = useStore((s) => s.outletPnl);
  const outletPnlSyncAt = useStore((s) => s.outletPnlSyncAt);
  const outletMoneyEditCount = useStore((s) => s.outletMoneyEditCount);
  const shifts = useStore((s) => s.shifts);
  const [outletFilter, setOutletFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-06-01");
  const [dateTo, setDateTo] = useState("2026-06-04");

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

      <IzCard flat className="mt-2 border-[rgba(124,107,255,.25)]">
        <div className="flex items-start gap-2">
          <RefreshCw
            className={`mt-0.5 h-4 w-4 shrink-0 ${outletMoneyEditCount > 0 ? "text-[var(--iz-green)]" : "text-[var(--iz-muted2)]"}`}
          />
          <div>
            {outletMoneyEditCount > 0 ? (
              <>
                <p className="iz-sm font-bold text-[var(--iz-green)]">
                  Live sync · {outletMoneyEditCount} outlet edit{outletMoneyEditCount > 1 ? "s" : ""}
                </p>
                <p className="iz-tiny iz-muted mt-0.5">
                  Last update {formatSyncTime(outletPnlSyncAt)}
                  {liveShift && (
                    <>
                      {" "}
                      · {liveShift.outletName} floor RM {liveShift.liveSales.toLocaleString()} (
                      {liveShift.drinkUnits} drinks × RM{liveShift.perDrinkRm} + {liveShift.tableUnits} tables × RM
                      {liveShift.perTableRm})
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="iz-tiny iz-muted">
                No outlet money edits yet — changes from outlet Home sync here instantly.
              </p>
            )}
            <p className="iz-tiny iz-muted2 mt-1">
              Gross revenue, PR commission (payroll/PV), agency net &amp; outlet net recalc on every per-drink / per-table
              edit.
            </p>
          </div>
        </div>
      </IzCard>

      <div className="iz-grid2 mt-3">
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-green)]">{formatRM(totals.agencyNet)}</div>
          <div className="l">Agency net (PNL)</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n">{noShowRate}%</div>
          <div className="l">No-show rate</div>
        </div>
      </div>

      <IzSectionLabel>PNL · outlet ↔ agency ↔ PR</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-2 mb-2">
        Gross revenue updates when outlet changes live sales on tonight&apos;s floor.
      </p>
      <div className="space-y-2">
        {pnlRows.map((r) => (
          <IzCard key={r.outlet}>
            <div className="iz-between">
              <div className="font-sora text-sm font-bold">{r.outlet}</div>
              {r.syncedFromOutlet && <IzPill variant="green">Live</IzPill>}
            </div>
            {r.syncedFromOutlet && r.liveFloorGross > 0 && (
              <p className="iz-tiny text-[var(--iz-violet)] mt-1">
                Tonight floor sales RM {r.liveFloorGross.toLocaleString()} → rolled into gross
              </p>
            )}
            <div className="iz-v-sum mt-2">
              <span className="iz-muted">Gross revenue (outlet sales)</span>
              <b>{formatRM(r.grossRevenue)}</b>
            </div>
            <div className="iz-v-sum">
              <span className="iz-muted">PR payout · wages + commission</span>
              <b className="text-[var(--iz-red)]">−{formatRM(r.prPayout)}</b>
            </div>
            {r.syncedFromOutlet && (
              <p className="iz-tiny iz-muted2 pl-0">
                Wages {formatRM(r.prWages)} · Commission {formatRM(r.prCommission)} → payroll / PV
              </p>
            )}
            <div className="iz-v-sum">
              <span className="iz-muted">Platform ({OUTLET_COMMISSION_RULES.find((x) => x.outlet === r.outlet)?.platformPct ?? 5}%)</span>
              <b>−{formatRM(r.platformFee)}</b>
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

      <IzSectionLabel>Commission rules · per outlet</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-2 mb-2">
        PR drink / tip / table % applied to synced outlet sales — same rules as payroll PV lines.
      </p>
      <div className="space-y-2">
        {(outletFilter
          ? OUTLET_COMMISSION_RULES.filter((r) => r.outlet === outletFilter)
          : OUTLET_COMMISSION_RULES
        ).map((rule) => (
          <IzCard key={rule.outlet} flat>
            <div className="font-sora text-xs font-bold">{rule.outlet}</div>
            <p className="iz-tiny iz-muted2 mt-1">
              Wage RM{rule.wagePerHour}/hr · Drinks {rule.drinkPct}% · Tips {rule.tipPct}% · Table {rule.tablePct}% · OT
              after {rule.otAfterHours}h
            </p>
          </IzCard>
        ))}
      </div>

      <Link to="/agency/history" className="iz-btn iz-btn-soft mt-3 block text-center">
        View shift history · payout · drinks · tips
      </Link>

      <Link to="/agency/pv" className="iz-btn iz-btn-soft mt-2 block text-center">
        Payroll &amp; PV · uses PR commission from synced sales
      </Link>

      <p className="iz-tiny iz-muted2 mt-3 text-center">
        Auto reports on 15th &amp; month-end · Finance: payroll + PV + collection only
      </p>
    </div>
  );
}
