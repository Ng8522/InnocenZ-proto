import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { AgencyGpsPanel } from "@/components/agency/AgencyGpsPanel";
import { PrAvailabilityPanel } from "@/components/iz/PrAvailabilityPanel";
import { RosterShiftFilters } from "@/components/agency/RosterShiftFilters";
import { RosterShiftTable } from "@/components/agency/RosterShiftTable";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime, OUTLET_NAMES, type AgencyRosterSlot, type RosterSlotStatus } from "@/lib/agency-demo";
import { deriveLiveWorkforce } from "@/lib/portal-sync";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill, IzSelect, IzTimeInput, formatRM } from "@/components/iz/ui";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  EMPTY_ROSTER_SHIFT_FILTERS,
  filterRosterShifts,
  type RosterShiftFilterState,
} from "@/lib/roster-shift-filters";
import { agencyCan } from "@/lib/agency-rbac";
import { ArrowLeftRight, Calendar, ChevronRight, MapPin, Users, X } from "lucide-react";

export const Route = createFileRoute("/agency/roster")({
  component: AgencyRoster,
});

const EDITABLE_STATUSES: RosterSlotStatus[] = ["scheduled", "on-duty", "en-route", "unavailable"];

const STATUS_LABEL: Record<RosterSlotStatus, { label: string; variant: "green" | "amber" | "red" | "violet" | "ink" }> = {
  "on-duty": { label: "On duty", variant: "green" },
  "en-route": { label: "En route", variant: "amber" },
  scheduled: { label: "Scheduled", variant: "ink" },
  unavailable: { label: "Unavailable", variant: "red" },
  "swap-pending": { label: "Swap pending", variant: "violet" },
  "assignment-pending": { label: "Awaiting PR", variant: "amber" },
  "outlet-pending": { label: "Awaiting outlet", variant: "amber" },
};

type ViewMode = "live" | "planning";

function AgencyRoster() {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const prSubRole = useStore((s) => s.prSubRole);
  const editRosterSlot = useStore((s) => s.editRosterSlot);
  const requestOutletSwap = useStore((s) => s.requestOutletSwap);
  const cancelOutletSwap = useStore((s) => s.cancelOutletSwap);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const prSwapRequests = useStore((s) => s.prSwapRequests);
  const approvePrSwapRequest = useStore((s) => s.approvePrSwapRequest);
  const declinePrSwapRequest = useStore((s) => s.declinePrSwapRequest);
  const demoAutoAssignPr = useStore((s) => s.demoAutoAssignPr);
  const flagRosterAttendance = useStore((s) => s.flagRosterAttendance);
  const { date, time } = nowAgencyDateTime();
  const [dateFilter, setDateFilter] = useState(DEFAULT_ROSTER_DATE_ISO);
  const [shiftFilters, setShiftFilters] = useState<RosterShiftFilterState>(EMPTY_ROSTER_SHIFT_FILTERS);
  const [editId, setEditId] = useState<string | null>(null);
  const [approveSwapId, setApproveSwapId] = useState<string | null>(null);
  const [replacementPick, setReplacementPick] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const canAssign = agencyCan(agencySubRole, "assignShifts");

  const dates = useMemo(() => [...new Set(agencyRoster.map((s) => s.dateIso))], [agencyRoster]);

  const dateFiltered = useMemo(
    () => agencyRoster.filter((s) => !dateFilter || s.dateIso === dateFilter),
    [agencyRoster, dateFilter],
  );

  const filtered = useMemo(
    () => filterRosterShifts(dateFiltered, shiftFilters),
    [dateFiltered, shiftFilters],
  );

  const swapCount = agencyRoster.filter((s) => s.outletSwap?.status === "pending_pr").length;
  const assignCount = agencyRoster.filter((s) => s.status === "assignment-pending").length;
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

  const dateIso = dateFilter || DEFAULT_ROSTER_DATE_ISO;
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);
  const workforce = useMemo(
    () => deriveLiveWorkforce(agencyRoster, dateIso, outletCommissionRules, perDrinkRm),
    [agencyRoster, dateIso, outletCommissionRules, perDrinkRm],
  );
  const activeCount = workforce.filter((w) => w.status === "on-duty" || w.status === "en-route").length;
  const estPayoutLive = useMemo(() => workforce.reduce((s, w) => s + w.estPayout, 0), [workforce]);
  const scheduled = useMemo(
    () => agencyRoster.filter((s) => s.dateIso === dateIso && s.status !== "unavailable"),
    [agencyRoster, dateIso],
  );
  const estLabour = useMemo(
    () => scheduled.reduce((s, slot) => s + (slot.estPayout ?? 350), 0) * 1.08,
    [scheduled],
  );

  const openEdit = useCallback((id: string) => setEditId(id), []);

  return (
    <div className="iz-screen iz-roster-page">

      <header className="iz-roster-head">
        <div className="min-w-0 flex-1">
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)] md:text-xl">Roster</h2>
          <p className="iz-tiny iz-muted mt-0.5">
            {date} · {time}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {assignCount > 0 && <IzPill variant="amber">{assignCount} assign</IzPill>}
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
          <IzSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Date">
            <option value={DEFAULT_ROSTER_DATE_ISO}>Today</option>
            {dates.filter((d) => d !== DEFAULT_ROSTER_DATE_ISO).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </IzSelect>
        </div>
        {canAssign && (
          <Link to="/agency/prs" className="iz-roster-pr-link">
            <Users className="h-3.5 w-3.5" />
            Manage PR
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="iz-roster-kpis">
        {viewMode === "live" ? (
          <>
            <div className="iz-roster-kpi">
              <span className="n">{activeCount}</span>
              <span className="l">PRs active today</span>
            </div>
            <div className="iz-roster-kpi">
              <span className="n gold">{formatRM(estPayoutLive)}</span>
              <span className="l">Est. payout today</span>
            </div>
          </>
        ) : (
          <>
            <div className="iz-roster-kpi">
              <span className="n">{scheduled.length}</span>
              <span className="l">PRs scheduled</span>
            </div>
            <div className="iz-roster-kpi">
              <span className="n gold">{formatRM(estLabour)}</span>
              <span className="l">Est. labour cost</span>
            </div>
          </>
        )}
      </div>

      {viewMode === "live" && (
        <div className="iz-roster-gps">
          <AgencyGpsPanel
            roster={agencyRoster}
            agencyPRs={agencyPRs}
            dateIso={dateIso}
            prCheckInMeta={prCheckInMeta}
            prSubRole={prSubRole}
          />
        </div>
      )}

      {viewMode === "planning" && canAssign && (
        <>
          <IzCard flat className="iz-roster-planning-hint">
            <p className="iz-tiny iz-muted">
              Planning = projected wages + commission. Assign free PRs below — many PRs can share one outlet or
              spread across venues.
            </p>
            <button
              type="button"
              className="iz-btn iz-btn-soft mt-2 !text-xs"
              onClick={() => demoAutoAssignPr(dateIso)}
            >
              AI auto-assign next free PR
            </button>
          </IzCard>
          <div className="iz-roster-assign mt-3">
            <PrAvailabilityPanel dateIso={dateIso} sortByOutlet={shiftFilters.outlet} />
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

      <OutletSection
        title="Shifts"
        hint={viewMode === "live" ? "Editable roster · synced with outlet floor" : "Forecast · tap Edit to adjust"}
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
          canAssign={canAssign}
          onEdit={openEdit}
          onFlagLate={(id) => flagRosterAttendance(id, "late")}
          onFlagNoShow={(id) => flagRosterAttendance(id, "no-show")}
          onCancelSwap={cancelOutletSwap}
        />
      </OutletSection>

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
            <div className="iz-cardttl">Assign replacement</div>
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
}: {
  slot: AgencyRosterSlot;
  onClose: () => void;
  onSave: (patch: Partial<AgencyRosterSlot>) => void;
  onRequestOutletSwap: (targetOutlet: string, note: string) => void;
}) {
  const initialStatus = EDITABLE_STATUSES.includes(slot.status) ? slot.status : "scheduled";
  const [status, setStatus] = useState<RosterSlotStatus>(initialStatus);
  const [shiftStart, setShiftStart] = useState(slot.shiftStart);
  const [shiftEnd, setShiftEnd] = useState(slot.shiftEnd);
  const [swapOutlet, setSwapOutlet] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [busy, setBusy] = useState(false);
  const shiftPreview = `${shiftStart} — ${shiftEnd}`;
  const swapTargets = OUTLET_NAMES.filter((o) => o !== slot.outlet);
  const canRequestSwap = !slot.outletSwap || slot.outletSwap.status !== "pending_pr";

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

        <div className="iz-sheet-actions">
          <button type="button" className="iz-btn iz-btn-soft flex-1 !py-3" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="iz-btn iz-btn-primary flex-1 !py-3" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </IzSheet>
  );
}
