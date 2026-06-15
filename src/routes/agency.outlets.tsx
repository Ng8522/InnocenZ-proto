import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgencyOutletFilters } from "@/components/agency/AgencyOutletFilters";
import { OutletSection } from "@/components/outlet/OutletSection";
import {
  EMPTY_AGENCY_OUTLET_FILTERS,
  buildAgencyOutletSummaries,
  collectOutletShiftDateIsos,
  filterAgencyOutletSummaries,
  outletShiftSourceLabel,
  shiftDestinationLabel,
  type AgencyOutletAvailableShift,
  type AgencyOutletSummary,
} from "@/lib/agency-outlet-shifts";
import { agencyCan } from "@/lib/agency-rbac";
import { useStore } from "@/lib/store";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { PR_AGENCY_TIED_OFFERS } from "@/lib/pr-features";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/agency/outlets")({
  component: AgencyManageOutlets,
});

function AgencyManageOutlets() {
  const shifts = useStore((s) => s.shifts);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const [filters, setFilters] = useState(EMPTY_AGENCY_OUTLET_FILTERS);
  const [detailOutlet, setDetailOutlet] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const canManage = agencyCan(agencySubRole, "managePr");

  const summaries = useMemo(
    () =>
      buildAgencyOutletSummaries({
        shifts,
        roster: agencyRoster,
        tiedOffers: PR_AGENCY_TIED_OFFERS,
        todayIso: DEFAULT_ROSTER_DATE_ISO,
      }),
    [shifts, agencyRoster],
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

  if (!canManage) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
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
          <b className="text-[var(--iz-muted)]">Posted</b> shifts come from outlet bookings.
          {" "}
          <b className="text-[var(--iz-violet-l)]">Outlet offers</b> are tied agency listings.
          {" "}
          <b className="text-[var(--iz-amber)]">Awaiting PR</b> slots need assignment on roster.
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
                      {summary.openShiftCount} open
                    </IzPill>
                  ) : (
                    <IzPill variant="ink" className="!py-0.5 !text-[10px]">
                      No open shifts
                    </IzPill>
                  )}
                  {summary.totalOpenSlots > 0 && (
                    <IzPill variant="violet" className="!py-0.5 !text-[10px]">
                      {summary.totalOpenSlots} slot{summary.totalOpenSlots !== 1 ? "s" : ""}
                    </IzPill>
                  )}
                </div>

                <p className="text-xs leading-snug text-[var(--iz-muted2)] line-clamp-2">
                  {summary.scheduledTonight} PRs tonight · Drinks {summary.rule.drinkPct}% · Tips{" "}
                  {summary.rule.tipPct}%
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
  onBack,
}: {
  summary: AgencyOutletSummary;
  shifts: AgencyOutletAvailableShift[];
  onBack: () => void;
}) {
  return (
    <div className="iz-screen">
      <button type="button" className="iz-btn iz-btn-soft mb-3 !py-2 !text-xs" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to outlets
      </button>

      <header className="mb-3">
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-violet-l)]">{summary.outlet}</h2>
        <p className="iz-tiny iz-muted mt-0.5">
          Wage RM{summary.rule.wagePerHour}/hr · Drinks {summary.rule.drinkPct}% · Tips {summary.rule.tipPct}% · Table{" "}
          {summary.rule.tablePct}%
        </p>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <IzCard flat className="!p-3 text-center">
          <div className="font-sora text-xl font-extrabold text-[var(--iz-amber)]">{shifts.length}</div>
          <div className="iz-tiny iz-muted2">Open shifts</div>
        </IzCard>
        <IzCard flat className="!p-3 text-center">
          <div className="font-sora text-xl font-extrabold text-[var(--iz-green)]">{summary.scheduledTonight}</div>
          <div className="iz-tiny iz-muted2">PRs tonight</div>
        </IzCard>
      </div>

      <OutletSection title="Available shifts" hint={`${shifts.length} listing${shifts.length !== 1 ? "s" : ""}`}>
        {shifts.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No open shifts match your filters.</p>
          </IzCard>
        ) : (
          <div className="grid gap-2">
            {shifts.map((shift) => (
              <OutletShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </OutletSection>

      <Link to="/agency/roster" className="iz-btn iz-btn-primary mt-4 flex w-full items-center justify-center gap-1.5">
        Assign on roster
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function OutletShiftCard({ shift }: { shift: AgencyOutletAvailableShift }) {
  const sourceVariant =
    shift.source === "posted" ? "ink" : shift.source === "tied-offer" ? "violet" : "amber";

  return (
    <IzCard flat>
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

      <div className="mt-2 flex flex-wrap gap-1">
        <IzPill variant="amber" className="!text-[9px]">
          {shift.openSlots} open slot{shift.openSlots !== 1 ? "s" : ""}
        </IzPill>
        <IzPill variant="gold" className="!text-[9px]">
          Est. {formatRM(shift.payEstimate)}
        </IzPill>
        {shift.vip && (
          <IzPill variant="violet" className="!text-[9px]">
            VIP
          </IzPill>
        )}
        {shift.destination && (
          <IzPill variant="ink" className="!text-[9px]">
            {shiftDestinationLabel(shift.destination)}
          </IzPill>
        )}
      </div>

      {shift.languages && (
        <p className="iz-tiny iz-muted mt-2">Languages · {shift.languages}</p>
      )}
      {shift.briefing && (
        <p className="iz-tiny iz-muted2 mt-1 line-clamp-2">{shift.briefing}</p>
      )}
    </IzCard>
  );
}
