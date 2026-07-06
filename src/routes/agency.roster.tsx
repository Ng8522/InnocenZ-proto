import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AgencyGpsPanel } from "@/components/agency/AgencyGpsPanel";
import { RosterTimetableFilters } from "@/components/agency/RosterTimetableFilters";
import { RosterWeeklyTimetable } from "@/components/agency/RosterWeeklyTimetable";
import { RosterPlanningDatePicker } from "@/components/agency/RosterPlanningDatePicker";
import { RosterShiftFilters } from "@/components/agency/RosterShiftFilters";
import { RosterShiftTable } from "@/components/agency/RosterShiftTable";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import {
  nowAgencyDateTime,
  OUTLET_NAMES,
  rosterPageDisplayStatus,
  type AgencyRosterSlot,
  type RosterSlotStatus,
} from "@/lib/agency-demo";
import { deriveLiveWorkforce } from "@/lib/portal-sync";
import { IzSheet } from "@/components/iz/Sheet";
import { LabelWithIcon } from "@/components/iz/TitleWithIcon";
import { IzCard, IzCardTitle, IzPageTitle, IzPill, IzSelect, IzTimeInput, formatRM } from "@/components/iz/ui";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  EMPTY_ROSTER_SHIFT_FILTERS,
  EMPTY_ROSTER_TIMETABLE_FILTERS,
  countTimetableMatchingSlots,
  filterRosterShifts,
  filterTimetablePrs,
  type RosterShiftFilterState,
  type RosterTimetableFilterState,
} from "@/lib/roster-shift-filters";
import { getPrScheduleState } from "@/lib/roster-availability";
import { agencyCan } from "@/lib/agency-rbac";
import { mondayOfWeek, weekDayIsos, weekRangeLabel, dedupeLiveRosterByPr } from "@/lib/roster-week-plan";
import { ArrowLeftRight, Calendar, ChevronRight, MapPin, Trash2, Users, X } from "lucide-react";

const EDITABLE_STATUSES: RosterSlotStatus[] = ["scheduled", "on-duty", "unavailable"];

const STATUS_LABEL: Record<RosterSlotStatus, { label: string; variant: "green" | "amber" | "red" | "violet" | "ink" }> = {
  "on-duty": { label: "On duty", variant: "green" },
  "en-route": { label: "Scheduled", variant: "ink" },
  scheduled: { label: "Scheduled", variant: "ink" },
  unavailable: { label: "Unavailable", variant: "red" },
  "swap-pending": { label: "Swap pending", variant: "violet" },
  "assignment-pending": { label: "Awaiting PR", variant: "amber" },
  "outlet-request-pending": { label: "Outlet request", variant: "amber" },
  "outlet-pending": { label: "Awaiting outlet", variant: "amber" },
};

type ViewMode = "live" | "planning";

export const Route = createFileRoute("/agency/roster")({
  validateSearch: (search: Record<string, unknown>): { view?: ViewMode } =>
    search.view === "planning" ? { view: "planning" } : {},
  component: AgencyRoster,
});

function AgencyRoster() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { view } = Route.useSearch();
  const viewMode: ViewMode = view ?? "live";
  const setViewMode = (next: ViewMode) => navigate({ search: next === "live" ? {} : { view: next } });
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const prSubRole = useStore((s) => s.prSubRole);
  const editRosterSlot = useStore((s) => s.editRosterSlot);
  const cancelRosterShift = useStore((s) => s.cancelRosterShift);
  const requestOutletSwap = useStore((s) => s.requestOutletSwap);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const prSwapRequests = useStore((s) => s.prSwapRequests);
  const approvePrSwapRequest = useStore((s) => s.approvePrSwapRequest);
  const declinePrSwapRequest = useStore((s) => s.declinePrSwapRequest);
  const demoAutoAssignPr = useStore((s) => s.demoAutoAssignPr);
  const flagRosterAttendance = useStore((s) => s.flagRosterAttendance);
  const syncLivePrCheckInToRoster = useStore((s) => s.syncLivePrCheckInToRoster);
  const syncOutletRequestRoster = useStore((s) => s.syncOutletRequestRoster);
  const { date, time } = nowAgencyDateTime();
  const [planningDate, setPlanningDate] = useState(DEFAULT_ROSTER_DATE_ISO);
  const [shiftFilters, setShiftFilters] = useState<RosterShiftFilterState>(EMPTY_ROSTER_SHIFT_FILTERS);
  const [timetableFilters, setTimetableFilters] = useState<RosterTimetableFilterState>(
    EMPTY_ROSTER_TIMETABLE_FILTERS,
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [approveSwapId, setApproveSwapId] = useState<string | null>(null);
  const [replacementPick, setReplacementPick] = useState("");
  const canAssign = agencyCan(agencySubRole, "assignShifts");

  useEffect(() => {
    syncLivePrCheckInToRoster();
  }, [syncLivePrCheckInToRoster, agencyRoster.length]);

  const dates = useMemo(
    () => [...new Set(agencyRoster.map((s) => s.dateIso))].sort(),
    [agencyRoster],
  );

  const liveDateIso = DEFAULT_ROSTER_DATE_ISO;
  const weekStartIso = mondayOfWeek(planningDate);
  const weekDays = useMemo(() => weekDayIsos(weekStartIso), [weekStartIso]);

  const dateFiltered = useMemo(
    () => dedupeLiveRosterByPr(agencyRoster.filter((s) => s.dateIso === liveDateIso)),
    [agencyRoster, liveDateIso],
  );

  const filtered = useMemo(
    () =>
      [...filterRosterShifts(dateFiltered, shiftFilters)].sort((a, b) =>
        a.prName.localeCompare(b.prName, undefined, { sensitivity: "base" }),
      ),
    [dateFiltered, shiftFilters],
  );

  const pendingPrSwaps = useMemo(
    () =>
      prSwapRequests.filter((s) => {
        if (s.status !== "pending_agency" && s.status !== "pending_replacement") return false;
        const slot = agencyRoster.find((r) => r.id === s.rosterSlotId);
        if (slot && slot.prId !== s.requestingPrId) return false;
        return true;
      }),
    [prSwapRequests, agencyRoster],
  );
  const swapCount = pendingPrSwaps.length;
  const outletRequestCount = agencyRoster.filter((s) => s.status === "outlet-request-pending").length;
  const swapToApprove = approveSwapId
    ? prSwapRequests.find((s) => s.id === approveSwapId && s.status === "pending_agency")
    : null;
  const replacementCandidates = useMemo(
    () =>
      agencyPRs.filter(
        (p) =>
          !p.suspended &&
          !p.detached &&
          p.id !== swapToApprove?.requestingPrId,
      ),
    [agencyPRs, swapToApprove?.requestingPrId],
  );
  const editSlot = agencyRoster.find((s) => s.id === editId);

  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);
  const shifts = useStore((s) => s.shifts);
  const shiftApplicants = useStore((s) => s.shiftApplicants);

  useEffect(() => {
    syncOutletRequestRoster();
  }, [syncOutletRequestRoster, shifts, shiftApplicants]);

  const workforce = useMemo(
    () => deriveLiveWorkforce(agencyRoster, liveDateIso, outletCommissionRules, perDrinkRm),
    [agencyRoster, liveDateIso, outletCommissionRules, perDrinkRm],
  );
  const activeCount = dateFiltered.filter((s) => s.status === "on-duty" && !!s.checkedInAt).length;
  const liveWorkforce = useMemo(
    () => workforce.filter((w) => w.status === "on-duty"),
    [workforce],
  );
  const plannedCount = useMemo(
    () => dateFiltered.filter((s) => s.status !== "unavailable").length,
    [dateFiltered],
  );
  const estPayoutLive = useMemo(() => liveWorkforce.reduce((s, w) => s + w.estPayout, 0), [liveWorkforce]);
  const weekScheduled = useMemo(
    () => agencyRoster.filter((s) => weekDays.includes(s.dateIso) && s.status !== "unavailable"),
    [agencyRoster, weekDays],
  );
  const estLabour = useMemo(
    () => weekScheduled.reduce((s, slot) => s + (slot.estPayout ?? 350), 0) * 1.08,
    [weekScheduled],
  );

  const activePrs = useMemo(
    () => agencyPRs.filter((p) => !p.suspended && !p.detached),
    [agencyPRs],
  );
  const filteredTimetablePrs = useMemo(
    () =>
      filterTimetablePrs(activePrs, agencyRoster, weekDays, timetableFilters, (prId, dateIso) =>
        getPrScheduleState(prId, agencyRoster, dateIso),
      ),
    [activePrs, agencyRoster, weekDays, timetableFilters],
  );
  const timetableShiftCount = useMemo(
    () =>
      countTimetableMatchingSlots(
        agencyRoster,
        weekDays,
        new Set(filteredTimetablePrs.map((p) => p.id)),
        timetableFilters,
      ),
    [agencyRoster, weekDays, filteredTimetablePrs, timetableFilters],
  );
  const weekShiftTotal = useMemo(
    () => agencyRoster.filter((s) => weekDays.includes(s.dateIso)).length,
    [agencyRoster, weekDays],
  );

  const openEdit = useCallback((id: string) => setEditId(id), []);

  return (
    <div className="iz-screen iz-roster-page">

      <header className="iz-roster-head">
        <div className="min-w-0 flex-1">
          <IzPageTitle className="md:text-xl">Roster</IzPageTitle>
          <p className="iz-tiny iz-muted mt-0.5">
            {date} · {time}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {outletRequestCount > 0 && (
            <IzPill variant="amber">{outletRequestCount} outlet request{outletRequestCount !== 1 ? "s" : ""}</IzPill>
          )}
          {swapCount > 0 && (
            <IzPill variant="violet">
              {swapCount} swap{swapCount > 1 ? "s" : ""}
            </IzPill>
          )}
        </div>
      </header>

      <div className="iz-roster-toolbar">
        <div className="iz-roster-toggle">
          <button
            type="button"
            className={viewMode === "live" ? "on live" : ""}
            onClick={() => setViewMode("live")}
          >
            Live
          </button>
          <button
            type="button"
            className={viewMode === "planning" ? "on plan" : ""}
            onClick={() => setViewMode("planning")}
          >
            Planning
          </button>
        </div>
        <div className="iz-roster-filters">
          {viewMode === "live" ? (
            <div className="iz-roster-date-live" aria-label="Date: Today (live view)">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--iz-green)]" />
              <span>Today</span>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <RosterPlanningDatePicker
                value={planningDate}
                onChange={setPlanningDate}
                rosterDates={dates}
                hint="Pick any day — timetable shows that full week (Mon–Sun)."
              />
              <span className="iz-tiny iz-muted hidden sm:inline">{weekRangeLabel(weekStartIso)}</span>
            </div>
          )}
        </div>
        {canAssign && (
          <Link to="/agency/prs" className="iz-roster-pr-link">
            <Users className="h-3.5 w-3.5" />
            Manage PR
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className={`iz-roster-kpis${viewMode === "live" ? " cols-3" : ""}`}>
        {viewMode === "live" ? (
          <>
            <div className="iz-roster-kpi">
              <span className="n">{plannedCount}</span>
              <LabelWithIcon label="Planned PRs" className="l" />
            </div>
            <div className="iz-roster-kpi">
              <span className="n">{activeCount}</span>
              <LabelWithIcon label="Active PRs" className="l" />
            </div>
            <div className="iz-roster-kpi">
              <span className="n gold">{formatRM(estPayoutLive)}</span>
              <LabelWithIcon label="Est payout" className="l" />
            </div>
          </>
        ) : (
          <>
            <div className="iz-roster-kpi">
              <span className="n">{weekScheduled.length}</span>
              <LabelWithIcon label="Shifts this week" className="l" />
            </div>
            <div className="iz-roster-kpi">
              <span className="n gold">{formatRM(estLabour)}</span>
              <LabelWithIcon label="Est. labour cost" className="l" />
            </div>
          </>
        )}
      </div>

      {viewMode === "live" && (
        <div className="iz-roster-gps">
          <AgencyGpsPanel
            roster={agencyRoster}
            agencyPRs={agencyPRs}
            dateIso={liveDateIso}
            prCheckInMeta={prCheckInMeta}
            prSubRole={prSubRole}
          />
        </div>
      )}

      {viewMode === "planning" && (
        <>
          {canAssign && (
            <IzCard flat className="iz-roster-planning-hint">
              <p className="iz-tiny iz-muted">
                Weekly planning — assign outlet-posted shifts to PRs per day. Only open shifts from
                outlets appear; assignments are confirmed immediately — PRs can cancel per agency policy.
                Days without a posted shift still
                open the picker so you can see what is available.
              </p>
              <button
                type="button"
                className="iz-btn iz-btn-soft mt-2 !text-xs"
                onClick={() => demoAutoAssignPr(planningDate)}
              >
                AI auto-assign next free PR · {planningDate}
              </button>
            </IzCard>
          )}
          <div className="iz-roster-week mt-3">
            <RosterTimetableFilters
              filters={timetableFilters}
              onChange={(patch) => setTimetableFilters((prev) => ({ ...prev, ...patch }))}
              prCount={filteredTimetablePrs.length}
              totalPrs={activePrs.length}
              shiftCount={timetableShiftCount}
              totalShifts={weekShiftTotal}
            />
            <RosterWeeklyTimetable
              weekStartIso={weekStartIso}
              roster={agencyRoster}
              agencyPRs={agencyPRs}
              filters={timetableFilters}
              canAssign={canAssign}
              onEditSlot={openEdit}
              onWeekChange={setPlanningDate}
            />
          </div>
        </>
      )}

      {canAssign && pendingPrSwaps.length > 0 && (
        <OutletSection title="PR swap requests" hint={`${pendingPrSwaps.length} pending`} className="!mt-4">
          <div className="grid gap-2 md:grid-cols-2">
            {pendingPrSwaps.map((swap) => (
              <IzCard key={swap.id}>
                <p className="font-sora text-sm font-bold">{swap.requestingPrName}</p>
                <p className="iz-tiny iz-muted mt-0.5">
                  {swap.targetOutlet
                    ? `${swap.outlet} → ${swap.targetOutlet}`
                    : swap.outlet}{" "}
                  · {swap.date} · {swap.shift}
                </p>
                {swap.reason && (
                  <p className="iz-tiny iz-muted mt-1 line-clamp-2">&ldquo;{swap.reason}&rdquo;</p>
                )}
                {swap.status === "pending_replacement" && swap.replacementPrName && (
                  <p className="iz-tiny mt-2 text-[var(--iz-amber)]">
                    Awaiting {swap.replacementPrName} to accept coverage offer
                  </p>
                )}
                {swap.replacementDeclineReason && (
                  <p className="iz-tiny mt-1 text-[var(--iz-red)] line-clamp-2">
                    {swap.replacementPrName ?? "Replacement"} declined: &ldquo;{swap.replacementDeclineReason}&rdquo;
                  </p>
                )}
                {swap.status === "pending_agency" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs"
                      onClick={() => declinePrSwapRequest(swap.id)}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="iz-btn iz-btn-primary flex-1 !py-1.5 !text-xs"
                      onClick={() => {
                        setApproveSwapId(swap.id);
                        setReplacementPick(replacementCandidates[0]?.id ?? "");
                      }}
                    >
                      Pick replacement
                    </button>
                  </div>
                )}
              </IzCard>
            ))}
          </div>
        </OutletSection>
      )}

      {viewMode === "live" && (
      <OutletSection
        title="Shifts"
        hint="Editable roster · synced with outlet floor"
        className="!mt-4"
      >
        <RosterShiftFilters
          filters={shiftFilters}
          onChange={(patch) => setShiftFilters((prev) => ({ ...prev, ...patch }))}
          resultCount={filtered.length}
          totalCount={dateFiltered.length}
        />
        <RosterShiftTable
          slots={filtered}
          agencyPRs={agencyPRs}
          prSwapRequests={prSwapRequests}
          outletCommissionRules={outletCommissionRules}
          perDrinkRm={perDrinkRm}
          outletShifts={shifts}
          canAssign={canAssign}
          onEdit={openEdit}
          onFlagLate={(id) => flagRosterAttendance(id, "late")}
          onFlagNoShow={(id) => flagRosterAttendance(id, "no-show")}
          onCancelPrSwap={declinePrSwapRequest}
        />
      </OutletSection>
      )}

      {editSlot && (
        <EditRosterModal
          slot={editSlot}
          onClose={() => setEditId(null)}
          onSave={(patch) => {
            editRosterSlot(editSlot.id, patch);
            setEditId(null);
          }}
          onRequestOutletSwap={(targetOutlet, note) => {
            requestOutletSwap(editSlot.id, targetOutlet, note);
            setEditId(null);
          }}
          onCancelShift={() => {
            cancelRosterShift(editSlot.id);
            setEditId(null);
          }}
        />
      )}

      <IzSheet
        open={!!swapToApprove}
        onClose={() => {
          setApproveSwapId(null);
          setReplacementPick("");
        }}
      >
        {swapToApprove && (
          <>
            <IzCardTitle>Assign replacement</IzCardTitle>
            <p className="iz-tiny iz-muted mb-3">
              {swapToApprove.requestingPrName} wants to leave{" "}
              <strong className="text-[var(--iz-txt)]">{swapToApprove.outlet}</strong> for{" "}
              <strong className="text-[var(--iz-txt)]">{swapToApprove.targetOutlet}</strong> ·{" "}
              {swapToApprove.targetDate} · {swapToApprove.targetShift}. Pick a replacement for their current slot.
            </p>
            <label className="iz-tiny iz-muted mb-1 block">Replacement PR</label>
            <IzSelect
              value={replacementPick}
              onChange={(e) => setReplacementPick(e.target.value)}
              className="mb-4 w-full"
            >
              <option value="">Select PR…</option>
              {replacementCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.rating}★ · {p.trainingLevel}
                </option>
              ))}
            </IzSelect>
            <button
              type="button"
              className="iz-btn iz-btn-primary w-full"
              disabled={!replacementPick}
              onClick={() => {
                approvePrSwapRequest(swapToApprove.id, replacementPick);
                setApproveSwapId(null);
                setReplacementPick("");
              }}
            >
              Send offer to replacement
            </button>
          </>
        )}
      </IzSheet>
    </div>
  );
}

function EditRosterModal({
  slot,
  onClose,
  onSave,
  onRequestOutletSwap,
  onCancelShift,
}: {
  slot: AgencyRosterSlot;
  onClose: () => void;
  onSave: (patch: Partial<AgencyRosterSlot>) => void;
  onRequestOutletSwap: (targetOutlet: string, note: string) => void;
  onCancelShift: () => void;
}) {
  const displayStatus = rosterPageDisplayStatus(slot.status);
  const initialStatus = EDITABLE_STATUSES.includes(displayStatus) ? displayStatus : "scheduled";
  const [status, setStatus] = useState<RosterSlotStatus>(initialStatus);
  const [shiftStart, setShiftStart] = useState(slot.shiftStart);
  const [shiftEnd, setShiftEnd] = useState(slot.shiftEnd);
  const [swapOutlet, setSwapOutlet] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const shiftPreview = `${shiftStart} — ${shiftEnd}`;
  const swapTargets = OUTLET_NAMES.filter((o) => o !== slot.outlet);
  const canRequestSwap = !slot.outletSwap || slot.outletSwap.status !== "pending_pr";
  const canCancelShift = !slot.checkedOutAt;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onSave({ status, shiftStart, shiftEnd, shift: shiftPreview });
  };

  const handleSwap = () => {
    if (busy || !swapOutlet) return;
    setBusy(true);
    onRequestOutletSwap(swapOutlet, swapNote.trim());
  };

  return (
    <IzSheet open onClose={busy ? () => {} : onClose}>
      <form onSubmit={handleSave}>
        <div className="iz-sheet-head">
          <div>
            <p className="iz-tiny iz-muted2 uppercase tracking-widest">Edit shift</p>
            <h3>{slot.prName}</h3>
          </div>
          <button type="button" className="iz-sheet-close" onClick={onClose} disabled={busy} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="iz-sheet-meta">
          <span className="iz-sheet-meta-pill">
            <MapPin className="h-3 w-3" />
            <strong>{slot.outlet}</strong>
          </span>
          <span className="iz-sheet-meta-pill">
            <Calendar className="h-3 w-3" />
            {slot.date}
          </span>
        </div>

        <div>
          <span className="iz-field-label">Status</span>
          <div className="iz-status-chips" role="group" aria-label="Shift status">
            {EDITABLE_STATUSES.map((s) => {
              const meta = STATUS_LABEL[s];
              return (
                <button
                  key={s}
                  type="button"
                  className={`iz-status-chip${status === s ? " on" : ""}`}
                  data-variant={meta.variant}
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  disabled={busy}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <span className="iz-field-label">Start</span>
            <IzTimeInput value={shiftStart} onChange={setShiftStart} aria-label="Shift start time" />
          </div>
          <div>
            <span className="iz-field-label">End</span>
            <IzTimeInput value={shiftEnd} onChange={setShiftEnd} aria-label="Shift end time" />
          </div>
        </div>

        <div className="iz-sheet-preview">
          <div className="k">Shift window</div>
          <div className="v">{shiftPreview}</div>
        </div>

        {canRequestSwap && (
          <div className="mt-4 rounded-xl border border-[rgba(124,107,255,.3)] bg-[rgba(124,107,255,.06)] p-3">
            <div className="flex items-center gap-1.5 iz-tiny font-bold uppercase tracking-wide text-[var(--iz-violet)]">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Request outlet swap
            </div>
            <p className="iz-tiny iz-muted mt-1">
              {slot.prName} must approve before the outlet changes.
            </p>
            <div className="mt-3">
              <span className="iz-field-label">New outlet</span>
              <IzSelect block className="!text-sm" value={swapOutlet} onChange={(e) => setSwapOutlet(e.target.value)} disabled={busy}>
                <option value="">Select outlet…</option>
                {swapTargets.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </IzSelect>
            </div>
            <div className="mt-2">
              <span className="iz-field-label">Note to PR (optional)</span>
              <input
                className="iz-field-input !text-sm"
                value={swapNote}
                onChange={(e) => setSwapNote(e.target.value)}
                placeholder="Reason for relocation…"
                disabled={busy}
              />
            </div>
            <button
              type="button"
              className="iz-btn iz-btn-soft mt-3 w-full !text-xs"
              disabled={!swapOutlet || busy}
              onClick={handleSwap}
            >
              Send swap request to PR
            </button>
          </div>
        )}

        {canCancelShift && (
          <div className="mt-4 rounded-xl border border-[rgba(255,117,117,.25)] bg-[rgba(255,117,117,.06)] p-3">
            <div className="flex items-center gap-1.5 iz-tiny font-bold uppercase tracking-wide text-[var(--destructive)]">
              <Trash2 className="h-3.5 w-3.5" />
              Cancel shift
            </div>
            <p className="iz-tiny iz-muted mt-1">
              Remove this assignment — {slot.prName} will be notified and freed for {slot.date}.
            </p>
            <button
              type="button"
              className="iz-btn iz-btn-danger mt-3 w-full !text-xs"
              disabled={busy}
              onClick={() => setCancelConfirmOpen(true)}
            >
              Cancel shift
            </button>
          </div>
        )}

        <div className="iz-sheet-actions">
          <button type="button" className="iz-btn iz-btn-soft flex-1 !py-3" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button type="submit" className="iz-btn iz-btn-primary flex-1 !py-3" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <IzSheet open={cancelConfirmOpen} onClose={() => !busy && setCancelConfirmOpen(false)}>
        <IzCardTitle>Cancel this shift?</IzCardTitle>
        <p className="iz-tiny iz-muted mb-3">
          {slot.prName} at <strong className="text-[var(--iz-txt)]">{slot.outlet}</strong> · {slot.date} ·{" "}
          {slot.shift}. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="iz-btn iz-btn-soft flex-1"
            disabled={busy}
            onClick={() => setCancelConfirmOpen(false)}
          >
            Keep shift
          </button>
          <button
            type="button"
            className="iz-btn iz-btn-danger flex-1"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onCancelShift();
            }}
          >
            Cancel shift
          </button>
        </div>
      </IzSheet>
    </IzSheet>
  );
}
