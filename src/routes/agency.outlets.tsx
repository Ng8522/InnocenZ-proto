import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AgencyCommissionRulesPanel } from "@/components/agency/AgencyCommissionRulesPanel";
import { AgencyOutletFilters } from "@/components/agency/AgencyOutletFilters";
import { OutletSection } from "@/components/outlet/OutletSection";
import { ShiftTierWagesStrip } from "@/components/outlet/ShiftTierWagesStrip";
import {
  EMPTY_AGENCY_OUTLET_FILTERS,
  buildAgencyOutletSummaries,
  buildOutletDayDemandSummaries,
  collectOutletShiftDateIsos,
  filterAgencyOutletSummaries,
  groupOutletShiftsTodayFuture,
  outletShiftSourceLabel,
  outletShiftEventTypeLabel,
  outletShiftIsSpecialEvent,
  outletShiftStaffingLabel,
  summarizeOutletDemandTodayFuture,
  type AgencyOutletAvailableShift,
  type AgencyOutletDayDemand,
  type AgencyOutletSummary,
} from "@/lib/agency-outlet-shifts";
import { agencyCan } from "@/lib/agency-rbac";
import { formatTierSalesTargets, formatTierWageRange } from "@/lib/agency-demo";
import { useStore } from "@/lib/store";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { PR_AGENCY_TIED_OFFERS } from "@/lib/pr-features";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/agency/outlets")({
  component: AgencyManageOutlets,
  validateSearch: (search: Record<string, unknown>) => ({
    outlet:
      typeof search.outlet === "string" && search.outlet.trim() ? search.outlet.trim() : undefined,
  }),
});

function AgencyManageOutlets() {
  const { outlet: outletFromSearch } = Route.useSearch();
  const shifts = useStore((s) => s.shifts);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const [filters, setFilters] = useState(EMPTY_AGENCY_OUTLET_FILTERS);
  const [detailOutlet, setDetailOutlet] = useState<string | null>(outletFromSearch ?? null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (outletFromSearch) setDetailOutlet(outletFromSearch);
  }, [outletFromSearch]);

  const canManage = agencyCan(agencySubRole, "managePr");

  const summaries = useMemo(
    () =>
      buildAgencyOutletSummaries({
        shifts,
        roster: agencyRoster,
        tiedOffers: PR_AGENCY_TIED_OFFERS,
        todayIso: DEFAULT_ROSTER_DATE_ISO,
        commissionRules: outletCommissionRules,
        outletWorkspace,
      }),
    [shifts, agencyRoster, outletCommissionRules, outletWorkspace],
  );

  const shiftDateIsos = useMemo(() => collectOutletShiftDateIsos(summaries), [summaries]);

  const filtered = useMemo(
    () => filterAgencyOutletSummaries(summaries, filters),
    [summaries, filters],
  );

  const detail = summaries.find((s) => s.outlet === detailOutlet) ?? null;
  const detailShifts = useMemo(() => {
    if (!detail) return [];
    return filterAgencyOutletSummaries([detail], filters)[0]?.shifts ?? detail.shifts;
  }, [detail, filters]);

  const detailDayDemand = useMemo(() => {
    if (!detail) return [];
    return buildOutletDayDemandSummaries({
      outlet: detail.outlet,
      posted: shifts,
      roster: agencyRoster,
      tiedOffers: PR_AGENCY_TIED_OFFERS,
      todayIso: DEFAULT_ROSTER_DATE_ISO,
    });
  }, [detail, shifts, agencyRoster]);

  if (!canManage) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">
            Access restricted
          </h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">Finance role cannot manage outlets.</p>
        </IzCard>
      </div>
    );
  }

  if (detail) {
    return (
      <AgencyOutletDetail
        summary={detail}
        shifts={detailShifts}
        dayDemand={detailDayDemand}
        onBack={() => setDetailOutlet(null)}
      />
    );
  }

  const toggleSelect = (outlet: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(outlet)) next.delete(outlet);
      else next.add(outlet);
      return next;
    });
  };

  const selectAllFiltered = () => setSelected(new Set(filtered.map((s) => s.outlet)));

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Manage Outlet</h2>
        <p className="iz-tiny iz-muted mt-0.5">Browse venues · open shifts · assign from roster</p>
      </header>

      <IzCard flat className="border-[var(--iz-line2)]">
        <p className="iz-tiny iz-muted2 leading-relaxed">
          Outlets post shifts and request PRs through your agency. Assignments stay{" "}
          <b className="text-[var(--iz-amber)]">awaiting PR</b> until the PR approves on their portal.
        </p>
      </IzCard>

      <IzCard flat className="iz-outlet-manage-filters-card">
        <div className="flex items-center gap-2 iz-tiny iz-muted mb-2">
          <Filter className="h-3.5 w-3.5" /> Filter outlets
        </div>
        <AgencyOutletFilters
          filters={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          shiftDateIsos={shiftDateIsos}
        />
      </IzCard>

      <OutletSection
        title={`${filtered.length} outlet${filtered.length !== 1 ? "s" : ""}`}
        trailing={
          <div className="flex gap-1.5">
            {selectMode && (
              <button type="button" className="iz-chip !text-xs" onClick={selectAllFiltered}>
                All
              </button>
            )}
            <button
              type="button"
              className={`iz-chip !text-xs${selectMode ? " ring-1 ring-[var(--iz-gold)]" : ""}`}
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected(new Set());
              }}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        }
      >
        {selectMode && (
          <p className="iz-tiny iz-muted2 mb-2">
            {selected.size === 0 ? "Tap outlet rows to multi-select" : `${selected.size} selected`}
          </p>
        )}
        {selectMode && selected.size > 0 && (
          <Link
            to="/agency/roster"
            className="iz-btn iz-btn-primary mb-2 flex w-full items-center justify-center gap-1.5 !py-2.5 !text-xs"
          >
            <Users className="h-3.5 w-3.5" /> Open roster to assign ({selected.size})
          </Link>
        )}

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((summary) => {
            const picked = selectMode && selected.has(summary.outlet);
            return (
              <div
                key={summary.outlet}
                role="button"
                tabIndex={0}
                className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-grad-card)] p-3 text-left transition-colors hover:border-[var(--iz-line2)]${picked ? " ring-1 ring-[var(--iz-gold)]" : ""}`}
                onClick={() => {
                  if (selectMode) toggleSelect(summary.outlet);
                  else setDetailOutlet(summary.outlet);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  if (selectMode) toggleSelect(summary.outlet);
                  else setDetailOutlet(summary.outlet);
                }}
              >
                {selectMode && (
                  <div
                    className={`absolute left-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded border shadow-sm ${
                      picked
                        ? "border-[var(--iz-gold)] bg-[var(--iz-gold)] text-[var(--iz-bg)]"
                        : "border-[var(--iz-line2)] bg-[var(--iz-bg2)]/95"
                    }`}
                  >
                    {picked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] text-[var(--iz-violet-l)]">
                    <MapPin className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-sora text-base font-bold leading-tight text-[var(--iz-violet-l)]">
                      {summary.outlet}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--iz-muted2)]">
                      RM{summary.rule.wagePerHour}/hr wage
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {summary.openShiftCount > 0 ? (
                    <IzPill variant="amber" className="!py-0.5 !text-[10px]">
                      {summary.openShiftCount} Event{summary.openShiftCount !== 1 ? "s" : ""}
                    </IzPill>
                  ) : (
                    <IzPill variant="ink" className="!py-0.5 !text-[10px]">
                      No events
                    </IzPill>
                  )}
                </div>

                {(summary.todayDemand > 0 || summary.futureDemand > 0) && (
                  <div className="rounded-lg border border-[rgba(167,139,250,.28)] bg-[rgba(167,139,250,.08)] px-2.5 py-2">
                    <p className="font-sora text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-violet-l)]">
                      Demand / supplied
                    </p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {summary.todayDemand > 0 && (
                        <div
                          className={`flex min-w-0 flex-col gap-0.5 rounded-md border border-[rgba(167,139,250,.35)] bg-[var(--iz-violet-ink)] px-1.5 py-1.5${
                            summary.futureDemand > 0 ? "" : " col-span-2"
                          }`}
                        >
                          <span className="text-[10px] font-medium leading-none text-[var(--iz-muted2)]">Today</span>
                          <span className="font-sora text-sm font-extrabold leading-none tabular-nums text-[var(--iz-violet-l)]">
                            {summary.todayDemand}/{summary.todaySupplied}
                          </span>
                        </div>
                      )}
                      {summary.futureDemand > 0 && (
                        <div
                          className={`flex min-w-0 flex-col gap-0.5 rounded-md border border-[var(--iz-line2)] bg-[var(--iz-bg2)] px-1.5 py-1.5${
                            summary.todayDemand > 0 ? "" : " col-span-2"
                          }`}
                        >
                          <span className="text-[10px] font-medium leading-none text-[var(--iz-muted2)]">Future</span>
                          <span className="font-sora text-sm font-extrabold leading-none tabular-nums text-[var(--iz-txt)]">
                            {summary.futureDemand}/{summary.futureSupplied}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs leading-snug text-[var(--iz-muted2)] line-clamp-2">
                  Drinks {summary.rule.drinkPct}% · Tips {summary.rule.tipPct}%
                </p>
              </div>
            );
          })}
        </div>
      </OutletSection>
    </div>
  );
}

function AgencyOutletDetail({
  summary,
  shifts,
  dayDemand,
  onBack,
}: {
  summary: AgencyOutletSummary;
  shifts: AgencyOutletAvailableShift[];
  dayDemand: AgencyOutletDayDemand[];
  onBack: () => void;
}) {
  const shiftGroups = useMemo(
    () => groupOutletShiftsTodayFuture(shifts, DEFAULT_ROSTER_DATE_ISO),
    [shifts],
  );
  const todayDemand = dayDemand.find((day) => day.dateIso === DEFAULT_ROSTER_DATE_ISO);
  const demandOverview = useMemo(
    () => summarizeOutletDemandTodayFuture(dayDemand, DEFAULT_ROSTER_DATE_ISO),
    [dayDemand],
  );

  return (
    <div className="iz-screen">
      <button type="button" className="iz-btn iz-btn-soft mb-3 !py-2 !text-xs" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to outlets
      </button>

      <header className="mb-3">
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-violet-l)]">
          {summary.outlet}
        </h2>
        <p className="iz-tiny iz-muted mt-0.5">
          Wage RM{summary.rule.wagePerHour}/hr · Drinks {summary.rule.drinkPct}% · Tips{" "}
          {summary.rule.tipPct}%
        </p>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-lg">
        <IzCard flat className="!p-3 text-center">
          <div className="font-sora text-xl font-extrabold text-[var(--iz-amber)]">
            {shifts.length}
          </div>
          <div className="iz-tiny iz-muted2">Events</div>
        </IzCard>
        <IzCard
          flat
          className="!p-3 text-center border-[rgba(167,139,250,.28)] bg-[rgba(167,139,250,.08)]"
        >
          <div className="font-sora text-xl font-extrabold text-[var(--iz-violet-l)]">
            {todayDemand ? `${todayDemand.demand}/${todayDemand.supplied}` : "—"}
          </div>
          <div className="iz-tiny font-semibold text-[var(--iz-violet-l)]">Today · demand / supplied</div>
        </IzCard>
      </div>

      {demandOverview.length > 0 && (
        <OutletSection
          title="Demand / supplied"
          hint="Today and future totals"
          className="!mb-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {demandOverview.map((day) => (
              <IzCard
                flat
                key={day.dateIso}
                className={`!p-3${
                  day.dateIso === DEFAULT_ROSTER_DATE_ISO
                    ? " border-[rgba(167,139,250,.28)] bg-[rgba(167,139,250,.08)]"
                    : day.dateIso === "future"
                      ? " border-[var(--iz-line2)] bg-[var(--iz-bg2)]"
                      : ""
                }`}
              >
                <p className="iz-tiny font-semibold uppercase tracking-wide text-[var(--iz-violet-l)]">
                  {day.dateLabel}
                </p>
                <div className="font-sora text-2xl font-extrabold text-[var(--iz-violet-l)]">
                  {day.demand}/{day.supplied}
                </div>
                <p className="iz-tiny iz-muted2 mt-0.5">
                  {day.eventCount} event{day.eventCount !== 1 ? "s" : ""}
                  {day.openSlots > 0 && ` · ${day.openSlots} open`}
                </p>
              </IzCard>
            ))}
          </div>
        </OutletSection>
      )}

      <OutletSection title="Commission rules" className="!mb-3">
        <AgencyCommissionRulesPanel outlet={summary.outlet} />
      </OutletSection>

      <OutletSection
        title="Available shifts"
        hint={`${shifts.length} listing${shifts.length !== 1 ? "s" : ""} · today and future · tap for tier pay & targets`}
      >
        {shifts.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No open shifts match your filters.</p>
          </IzCard>
        ) : shiftGroups.length > 0 ? (
          <div className="grid gap-3">
            {shiftGroups.map((group) => (
              <div key={group.dateIso}>
                <div className={`mb-1.5 flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 ${
                  group.dateIso === "future"
                    ? "border-[var(--iz-line2)] bg-[var(--iz-bg2)]"
                    : "border-[rgba(167,139,250,.22)] bg-[rgba(167,139,250,.06)]"
                }`}>
                  <p className="iz-tiny font-semibold uppercase tracking-wide text-[var(--iz-violet-l)]">
                    {group.dateLabel}
                  </p>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-violet-l)]">
                      Demand / supplied
                    </p>
                    <p className="font-sora text-lg font-extrabold leading-tight tabular-nums text-[var(--iz-violet-l)]">
                      {group.demand}
                      <span className="mx-0.5 text-[var(--iz-muted)]">/</span>
                      {group.supplied}
                      {group.openSlots > 0 && (
                        <span className="iz-tiny ml-1.5 font-semibold text-[var(--iz-amber)]">
                          · {group.openSlots} open
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {group.shifts.map((shift) => (
                    <OutletShiftCard key={shift.id} shift={shift} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {shifts.map((shift) => (
              <OutletShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </OutletSection>

      <Link
        to="/agency/roster"
        className="iz-btn iz-btn-primary mt-4 flex w-full items-center justify-center gap-1.5"
      >
        Assign on roster
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function OutletShiftMetric({
  label,
  tone,
  title,
  children,
}: {
  label: string;
  tone: "gold" | "violet" | "ink";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`iz-outlet-shift-metric iz-outlet-shift-metric--${tone}`}
      title={title}
    >
      <span className="iz-outlet-shift-metric__label">{label}</span>
      <div className="iz-outlet-shift-metric__value">{children}</div>
    </div>
  );
}

function OutletDemandSuppliedStat({
  demand,
  supplied,
  openSlots,
}: {
  demand: number;
  supplied: number;
  openSlots?: number;
}) {
  return (
    <div className="iz-outlet-shift-metric iz-outlet-shift-metric--demand">
      <span className="iz-outlet-shift-metric__label">Demand / supplied</span>
      <span className="iz-outlet-shift-metric__nums" aria-label={`${demand} demand, ${supplied} supplied`}>
        <span className="iz-outlet-shift-metric__demand">{demand}</span>
        <span className="iz-outlet-shift-metric__sep">/</span>
        <span className="iz-outlet-shift-metric__supplied">{supplied}</span>
      </span>
      {openSlots != null && openSlots > 0 && (
        <span className="iz-outlet-shift-metric__open">
          {openSlots} open slot{openSlots !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function OutletShiftCard({ shift }: { shift: AgencyOutletAvailableShift }) {
  const sourceVariant =
    shift.source === "assignment-pending" ? "amber" : "ink";
  const targetPay = formatTierWageRange(shift.tierRates);
  const salesTargets = formatTierSalesTargets(shift.tierRates);
  const eventType = outletShiftEventTypeLabel(shift);
  const isSpecialEvent = outletShiftIsSpecialEvent(shift);
  const staffing = outletShiftStaffingLabel(shift.destination);

  return (
    <details className="iz-outlet-booking-card group">
      <summary className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">{shift.event}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 iz-tiny iz-muted2">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {shift.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {shift.shift}
                </span>
              </div>
            </div>
            <IzPill variant={sourceVariant} className="shrink-0 !text-[9px]">
              {outletShiftSourceLabel(shift.source)}
            </IzPill>
          </div>

          <div className="iz-outlet-shift-metrics">
            <OutletDemandSuppliedStat
              demand={shift.demandSlots}
              supplied={shift.suppliedSlots}
              openSlots={shift.openSlots}
            />
            <OutletShiftMetric label="Est. payout" tone="gold">
              {formatRM(shift.payEstimate)}
            </OutletShiftMetric>
            <OutletShiftMetric
              label="Event type"
              tone={isSpecialEvent ? "gold" : "ink"}
              title={eventType}
            >
              {eventType}
            </OutletShiftMetric>
            <OutletShiftMetric label="Staffing" tone="ink">
              {staffing}
            </OutletShiftMetric>
          </div>

          <p className="iz-tiny iz-muted mt-2 truncate group-open:hidden">
            {targetPay}
            {salesTargets ? ` · ${salesTargets}` : ""}
          </p>
        </div>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-muted)] transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-[var(--iz-line)] px-3.5 pb-3.5 pt-2">
        {shift.languages && <p className="iz-tiny iz-muted">Languages · {shift.languages}</p>}
        {shift.briefing && <p className="iz-tiny iz-muted2 mt-1">{shift.briefing}</p>}
        <ShiftTierWagesStrip tierRates={shift.tierRates} compact />
      </div>
    </details>
  );
}
