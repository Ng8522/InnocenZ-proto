import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime, OUTLET_NAMES, type LiveWorkforceEntry } from "@/lib/agency-demo";
import { deriveLiveWorkforce } from "@/lib/portal-sync";
import type { AgencyRosterSlot, RosterSlotStatus } from "@/lib/agency-demo";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill, IzSelect, IzTimeInput, formatRM } from "@/components/iz/ui";
import { PrAvailabilityPanel } from "@/components/iz/PrAvailabilityPanel";
import { AgencyGpsPanel } from "@/components/agency/AgencyGpsPanel";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { agencyCan } from "@/lib/agency-rbac";
import { ArrowLeftRight, Calendar, Filter, MapPin, Pencil, Users, X } from "lucide-react";

export const Route = createFileRoute("/agency/roster")({
  component: AgencyRoster,
});

const STATUS_LABEL: Record<RosterSlotStatus, { label: string; variant: "green" | "amber" | "red" | "violet" | "ink" }> = {
  "on-duty": { label: "On duty", variant: "green" },
  "en-route": { label: "En route", variant: "amber" },
  scheduled: { label: "Scheduled", variant: "ink" },
  unavailable: { label: "Unavailable", variant: "red" },
  "swap-pending": { label: "Swap pending", variant: "violet" },
  "assignment-pending": { label: "Awaiting PR", variant: "amber" },
};

const EDITABLE_STATUSES: RosterSlotStatus[] = ["scheduled", "on-duty", "en-route", "unavailable"];

type ViewMode = "live" | "planning";

function AgencyRoster() {
  const agencyRoster = useStore((s) => s.agencyRoster);
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
  const [outletFilter, setOutletFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(DEFAULT_ROSTER_DATE_ISO);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const canAssign = agencyCan(agencySubRole, "assignShifts");

  const dates = useMemo(() => [...new Set(agencyRoster.map((s) => s.dateIso))], [agencyRoster]);

  const filtered = agencyRoster.filter((s) => {
    if (outletFilter && s.outlet !== outletFilter) return false;
    if (dateFilter && s.dateIso !== dateFilter) return false;
    return true;
  });

  const swapCount = agencyRoster.filter((s) => s.outletSwap?.status === "pending_pr").length;
  const assignCount = agencyRoster.filter((s) => s.status === "assignment-pending").length;
  const pendingPrSwaps = prSwapRequests.filter((s) => s.status === "pending_agency");
  const editSlot = agencyRoster.find((s) => s.id === editId);

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/agency" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Roster</h2>
        <p className="iz-tiny iz-muted mt-0.5">
          {date} · {time}
        </p>
        {(swapCount > 0 || assignCount > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {assignCount > 0 && <IzPill variant="amber">{assignCount} assign</IzPill>}
            {swapCount > 0 && (
              <IzPill variant="violet">
                {swapCount} swap{swapCount > 1 ? "s" : ""}
              </IzPill>
            )}
          </div>
        )}
      </header>

      <div className="mt-3 flex gap-2">
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

      {viewMode === "live" ? (
        <LiveWorkforceSection dateIso={dateFilter || DEFAULT_ROSTER_DATE_ISO} />
      ) : (
        <PlanningWorkforceSection dateIso={dateFilter || DEFAULT_ROSTER_DATE_ISO} onAutoAssign={() => demoAutoAssignPr(dateFilter || DEFAULT_ROSTER_DATE_ISO)} canAutoAssign={canAssign} />
      )}

      {canAssign && pendingPrSwaps.length > 0 && (
        <OutletSection title="PR swap requests" hint={`${pendingPrSwaps.length} pending`} className="!mt-4">
          <div className="space-y-2">
            {pendingPrSwaps.map((swap) => (
              <IzCard key={swap.id}>
                <p className="font-sora text-sm font-bold">{swap.outlet}</p>
                <p className="iz-tiny iz-muted mt-0.5">Replacement: {swap.replacementPrName}</p>
                {swap.reason && <p className="iz-tiny iz-muted2 mt-1">{swap.reason}</p>}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs" onClick={() => declinePrSwapRequest(swap.id)}>Decline</button>
                  <button type="button" className="iz-btn iz-btn-primary flex-1 !py-1.5 !text-xs" onClick={() => approvePrSwapRequest(swap.id)}>Approve</button>
                </div>
              </IzCard>
            ))}
          </div>
        </OutletSection>
      )}

      {canAssign && (
        <PrAvailabilityPanel
          dateIso={dateFilter || DEFAULT_ROSTER_DATE_ISO}
          sortByOutlet={outletFilter}
        />
      )}

      <IzCard flat className="mt-1">
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Filter className="h-3.5 w-3.5" />
          Filter by date · outlet · shift duration
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <IzSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value={DEFAULT_ROSTER_DATE_ISO}>Today · {DEFAULT_ROSTER_DATE_ISO}</option>
            {dates.filter((d) => d !== DEFAULT_ROSTER_DATE_ISO).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </IzSelect>
          <IzSelect value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)}>
            <option value="">All outlets</option>
            {OUTLET_NAMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </IzSelect>
        </div>
      </IzCard>

      {canAssign && (
        <Link to="/agency/prs" className="block mt-2">
          <IzCard className="flex items-center justify-between !mb-0">
            <div>
              <div className="font-sora text-sm font-bold">Manage PR roster</div>
              <div className="iz-tiny iz-muted mt-0.5">Filter age · language · race · height · rating · tier</div>
            </div>
            <span className="iz-tiny text-[var(--iz-gold-l)]">Open →</span>
          </IzCard>
        </Link>
      )}

      <OutletSection title="Shifts" hint="Date, time & attendance">
        <div className="space-y-2.5">
        {filtered.map((slot) => {
          const st = STATUS_LABEL[slot.status];
          return (
            <IzCard key={slot.id}>
              <div className="iz-between">
                <div>
                  <div className="font-sora text-[15px] font-bold">{slot.prName}</div>
                  <p className="iz-tiny iz-muted mt-0.5">{slot.outlet}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {slot.lateFlag && <IzPill variant="amber">Late</IzPill>}
                  {slot.noShowFlag && <IzPill variant="red">No-show</IzPill>}
                  <IzPill variant={st.variant}>{st.label}</IzPill>
                </div>
              </div>
              <p className="iz-sm mt-2 text-[var(--iz-gold-l)]">{slot.date}</p>
              <p className="iz-tiny iz-muted mt-0.5">
                Shift {slot.shiftStart} — {slot.shiftEnd} · {slot.shift}
              </p>
              {slot.checkedInAt && (
                <p className="iz-tiny iz-muted2 mt-1">
                  Check-in {slot.checkedInAt}
                  {slot.checkedOutAt ? ` · Check-out ${slot.checkedOutAt}` : ""}
                </p>
              )}
              {slot.status === "assignment-pending" && (
                <div className="mt-2 rounded-xl border border-[rgba(232,194,122,.35)] bg-[rgba(232,194,122,.08)] p-2.5">
                  <p className="iz-tiny font-bold text-[var(--iz-gold-l)]">Outlet assignment — awaiting PR</p>
                  <p className="iz-tiny iz-muted mt-1">
                    {slot.prName} must Approve or Reject on their Shifts screen
                  </p>
                  {slot.agencyAssignment?.agencyNote && (
                    <p className="iz-tiny iz-muted2 mt-1">{slot.agencyAssignment.agencyNote}</p>
                  )}
                  {slot.agencyAssignment?.assignedAt && (
                    <p className="iz-tiny iz-muted2 mt-1">Sent {slot.agencyAssignment.assignedAt}</p>
                  )}
                </div>
              )}
              {slot.outletSwap && (
                <div className="mt-2 rounded-xl border border-[rgba(124,107,255,.35)] bg-[rgba(124,107,255,.08)] p-2.5">
                  <div className="flex items-center gap-1.5 iz-tiny font-bold text-[var(--iz-violet)]">
                    <ArrowLeftRight className="h-3 w-3" /> Agency outlet swap
                  </div>
                  {slot.outletSwap.status === "pending_pr" ? (
                    <>
                      <p className="iz-tiny iz-muted mt-1">
                        Move to <span className="font-bold text-[var(--iz-gold-l)]">{slot.outletSwap.targetOutlet}</span>{" "}
                        — awaiting {slot.prName} to approve
                      </p>
                      {slot.outletSwap.agencyNote && (
                        <p className="iz-tiny iz-muted2 mt-1">{slot.outletSwap.agencyNote}</p>
                      )}
                      <p className="iz-tiny iz-muted2 mt-1">Sent {slot.outletSwap.requestedAt}</p>
                      <button
                        type="button"
                        className="iz-btn iz-btn-soft mt-2 w-full !py-1.5 !text-xs"
                        onClick={() => cancelOutletSwap(slot.id)}
                      >
                        Cancel request
                      </button>
                    </>
                  ) : slot.outletSwap.status === "approved" ? (
                    <p className="iz-tiny text-[var(--iz-green)] mt-1">
                      PR approved · now at {slot.outletSwap.targetOutlet}
                      {slot.outletSwap.respondedAt ? ` · ${slot.outletSwap.respondedAt}` : ""}
                    </p>
                  ) : (
                    <p className="iz-tiny text-[var(--iz-red)] mt-1">
                      PR declined · stays at {slot.outlet}
                      {slot.outletSwap.respondedAt ? ` · ${slot.outletSwap.respondedAt}` : ""}
                    </p>
                  )}
                </div>
              )}
              {canAssign && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs" onClick={() => setEditId(slot.id)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  {!slot.checkedInAt && slot.status !== "unavailable" && (
                    <>
                      <button type="button" className="iz-btn iz-btn-ghost !py-1.5 !text-xs" onClick={() => flagRosterAttendance(slot.id, "late")}>+Late</button>
                      <button type="button" className="iz-btn iz-btn-ghost !py-1.5 !text-xs" onClick={() => flagRosterAttendance(slot.id, "no-show")}>+No-show</button>
                    </>
                  )}
                </div>
              )}
            </IzCard>
          );
        })}
        </div>
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
    </div>
  );
}

function PlanningWorkforceSection({ dateIso, onAutoAssign, canAutoAssign }: { dateIso: string; onAutoAssign?: () => void; canAutoAssign?: boolean }) {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const scheduled = useMemo(
    () => agencyRoster.filter((s) => s.dateIso === dateIso && s.status !== "unavailable"),
    [agencyRoster, dateIso],
  );
  const estTotal = useMemo(
    () => scheduled.reduce((s, slot) => s + (slot.estPayout ?? 350), 0) * 1.08,
    [scheduled],
  );

  return (
    <section className="mt-1">
      <div className="iz-grid2">
        <div className="iz-stat-tile">
          <div className="n">{scheduled.length}</div>
          <div className="l">PRs scheduled</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-gold)]">{formatRM(estTotal)}</div>
          <div className="l">Est. labour cost</div>
        </div>
      </div>
      <IzCard flat className="mt-2 border-[rgba(232,194,122,.3)]">
        <p className="iz-tiny iz-muted">
          Planning = projected wages + commission for tonight. AI flags PRs with &gt;2 cancellations / 30 days.
        </p>
        <p className="iz-tiny text-[var(--iz-amber)] mt-2">Late at shift_start + 15 min · No-show at + 30 min</p>
        {canAutoAssign && onAutoAssign && (
          <button type="button" className="iz-btn iz-btn-soft mt-2 w-full !text-xs" onClick={onAutoAssign}>
            AI auto-assign next free PR
          </button>
        )}
      </IzCard>
    </section>
  );
}

function LiveWorkforceSection({ dateIso }: { dateIso: string }) {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const prSubRole = useStore((s) => s.prSubRole);
  const workforce = useMemo(() => deriveLiveWorkforce(agencyRoster, dateIso), [agencyRoster, dateIso]);
  const estTotal = useMemo(() => workforce.reduce((s, w) => s + w.estPayout, 0), [workforce]);
  const activeCount = workforce.filter((w) => w.status === "on-duty" || w.status === "en-route").length;

  return (
    <section className="mt-1">
      <IzCard glow className="!mb-2">
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          Live = today&apos;s floor · Planning = estimated cost today
        </div>
      </IzCard>

      <div className="iz-grid2">
        <div className="iz-stat-tile">
          <div className="n">{activeCount}</div>
          <div className="l">PRs active today</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-gold)]">{formatRM(estTotal)}</div>
          <div className="l">Est. payout today</div>
        </div>
      </div>

      <AgencyGpsPanel
        roster={agencyRoster}
        agencyPRs={agencyPRs}
        dateIso={dateIso}
        prCheckInMeta={prCheckInMeta}
        prSubRole={prSubRole}
      />

      <OutletSection title="On floor now" hint={`${workforce.length} PRs`}>
        <div className="space-y-2">
          {workforce.map((w) => (
            <LiveWorkforceCard key={w.id} entry={w} />
          ))}
        </div>
      </OutletSection>

      <OutletSection title="Planning" hint="Estimated today">
        <IzCard flat className="mb-3 border-[rgba(232,194,122,.3)]">
          <div className="iz-v-sum">
            <span className="iz-muted">Wages + commission (proj.)</span>
            <b className="iz-ledger text-[var(--iz-gold)]">{formatRM(estTotal)}</b>
          </div>
          <div className="iz-v-sum">
            <span className="iz-muted">Outlets covered</span>
            <b>{new Set(workforce.map((w) => w.outlet)).size}</b>
          </div>
          <div className="iz-v-sum">
            <span className="iz-muted">OT from check-out time</span>
            <b>Auto-calc on seal</b>
          </div>
          <p className="iz-tiny iz-muted2 mt-2">
            Same view as outlet portal — agency &amp; outlet see matching live workforce.
          </p>
        </IzCard>
      </OutletSection>
    </section>
  );
}

function LiveWorkforceCard({ entry: w }: { entry: LiveWorkforceEntry }) {
  return (
    <div className="iz-outlet-floor-row">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] font-sora text-lg font-bold">
        {w.prName.trim()[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-sora text-sm font-bold">{w.prName}</span>
          <IzPill
            variant={w.status === "on-duty" ? "green" : w.status === "en-route" ? "amber" : "ink"}
            className="!py-0.5 !text-[9px]"
          >
            {w.status === "on-duty" ? "On duty" : w.status === "en-route" ? "En route" : "Out"}
          </IzPill>
        </div>
        <p className="iz-tiny iz-muted truncate">
          {w.outlet}
          {w.checkIn ? ` · in ${w.checkIn}` : ""}
          {w.drinks > 0 ? ` · ${w.drinks} drinks` : ""}
        </p>
        <p className="iz-tiny text-[var(--iz-gold-l)]">
          Est. {formatRM(w.estPayout)}
          {w.tips > 0 ? ` · tips ${formatRM(w.tips)}` : ""}
        </p>
      </div>
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
  const shiftPreview = `${shiftStart} — ${shiftEnd}`;
  const swapTargets = OUTLET_NAMES.filter((o) => o !== slot.outlet);
  const canRequestSwap = !slot.outletSwap || slot.outletSwap.status !== "pending_pr";

  return (
    <IzSheet open onClose={onClose}>
      <div className="iz-sheet-head">
        <div>
          <button type="button" className="iz-chip mb-2 !px-2 !py-1 !text-[10px]" onClick={onClose}>
            ← Back to roster
          </button>
          <p className="iz-tiny iz-muted2 uppercase tracking-widest">Edit shift</p>
          <h3>{slot.prName}</h3>
        </div>
        <button type="button" className="iz-sheet-close" onClick={onClose} aria-label="Close">
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
          <IzTimeInput
            value={shiftStart}
            onChange={setShiftStart}
            aria-label="Shift start time"
          />
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
            Agency asks PR to move this shift to another outlet. {slot.prName} must approve or decline.
          </p>
          <div className="mt-3">
            <span className="iz-field-label">New outlet</span>
            <IzSelect block className="!text-sm" value={swapOutlet} onChange={(e) => setSwapOutlet(e.target.value)}>
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
            />
          </div>
          <button
            type="button"
            className="iz-btn iz-btn-soft mt-3 w-full !text-xs"
            disabled={!swapOutlet}
            onClick={() => onRequestOutletSwap(swapOutlet, swapNote.trim())}
          >
            Send swap request to PR
          </button>
        </div>
      )}

      {slot.outletSwap?.status === "pending_pr" && (
        <p className="iz-tiny iz-muted mt-3 text-center">
          Swap to {slot.outletSwap.targetOutlet} pending — cancel from roster card if needed.
        </p>
      )}

      <div className="iz-sheet-actions">
        <button type="button" className="iz-btn iz-btn-soft flex-1 !py-3" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-primary flex-1 !py-3"
          onClick={() =>
            onSave({
              status,
              shiftStart,
              shiftEnd,
              shift: shiftPreview,
            })
          }
        >
          Save changes
        </button>
      </div>
    </IzSheet>
  );
}
