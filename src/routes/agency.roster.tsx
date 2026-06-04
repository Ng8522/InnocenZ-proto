import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  nowAgencyDateTime,
  OUTLET_NAMES,
  SEED_LIVE_WORKFORCE,
  type LiveWorkforceEntry,
} from "@/lib/agency-demo";
import type { AgencyRosterSlot, RosterSlotStatus } from "@/lib/agency-demo";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill, IzSectionLabel, IzSelect, IzTimeInput, formatRM } from "@/components/iz/ui";
import { PrAvailabilityPanel } from "@/components/iz/PrAvailabilityPanel";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
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

function AgencyRoster() {
  const { agencyRoster, editRosterSlot, requestOutletSwap, cancelOutletSwap } = useStore();
  const { date, time } = nowAgencyDateTime();
  const [outletFilter, setOutletFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(DEFAULT_ROSTER_DATE_ISO);
  const [editId, setEditId] = useState<string | null>(null);

  const dates = useMemo(() => [...new Set(agencyRoster.map((s) => s.dateIso))], [agencyRoster]);

  const filtered = agencyRoster.filter((s) => {
    if (outletFilter && s.outlet !== outletFilter) return false;
    if (dateFilter && s.dateIso !== dateFilter) return false;
    return true;
  });

  const swapCount = agencyRoster.filter((s) => s.outletSwap?.status === "pending_pr").length;
  const assignCount = agencyRoster.filter((s) => s.status === "assignment-pending").length;
  const editSlot = agencyRoster.find((s) => s.id === editId);

  return (
    <div className="iz-screen">
      <AppHeader
        subtitle={`${date} · ${time}`}
        title="Roster"
        right={
          swapCount > 0 || assignCount > 0 ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {assignCount > 0 && (
                <IzPill variant="amber">
                  {assignCount} assign
                </IzPill>
              )}
              {swapCount > 0 && (
                <IzPill variant="violet">
                  {swapCount} swap{swapCount > 1 ? "s" : ""}
                </IzPill>
              )}
            </div>
          ) : undefined
        }
      />

      <LiveWorkforceSection />

      <PrAvailabilityPanel dateIso={dateFilter || DEFAULT_ROSTER_DATE_ISO} sortByOutlet={outletFilter} />

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

      <Link to="/agency/prs" className="block mt-2">
        <IzCard className="flex items-center justify-between !mb-0">
          <div>
            <div className="font-sora text-sm font-bold">Manage PR roster</div>
            <div className="iz-tiny iz-muted mt-0.5">Filter age · language · race · height · rating · 培养</div>
          </div>
          <span className="iz-tiny text-[var(--iz-gold-l)]">Open →</span>
        </IzCard>
      </Link>

      <IzSectionLabel>Shifts · date &amp; time</IzSectionLabel>
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
                <IzPill variant={st.variant}>{st.label}</IzPill>
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
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs"
                  onClick={() => setEditId(slot.id)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
            </IzCard>
          );
        })}
      </div>

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

function LiveWorkforceSection() {
  const workforce = SEED_LIVE_WORKFORCE;
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

      <IzSectionLabel>
        <Users className="mr-1 inline h-3.5 w-3.5" /> On floor now
      </IzSectionLabel>
      <div className="space-y-2.5">
        {workforce.map((w) => (
          <LiveWorkforceCard key={w.id} entry={w} />
        ))}
      </div>

      <IzSectionLabel>Planning · estimated today</IzSectionLabel>
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
    </section>
  );
}

function LiveWorkforceCard({ entry: w }: { entry: LiveWorkforceEntry }) {
  return (
    <IzCard>
      <div className="iz-between">
        <div>
          <div className="font-sora text-[15px] font-bold">{w.prName}</div>
          <p className="iz-tiny iz-muted mt-0.5">{w.outlet}</p>
        </div>
        <IzPill variant={w.status === "on-duty" ? "green" : w.status === "en-route" ? "amber" : "ink"}>
          {w.status === "on-duty" ? "On duty" : w.status === "en-route" ? "En route" : "Out"}
        </IzPill>
      </div>
      {w.checkIn && <p className="iz-tiny iz-muted2 mt-1.5">Check-in {w.checkIn}</p>}
      <div className="iz-grid2 mt-2">
        <div className="rounded-xl bg-[var(--iz-bg2)] p-2 text-center">
          <div className="iz-tiny iz-muted">Drinks</div>
          <div className="font-sora text-sm font-bold">{w.drinks}</div>
        </div>
        <div className="rounded-xl bg-[var(--iz-bg2)] p-2 text-center">
          <div className="iz-tiny iz-muted">Tips</div>
          <div className="font-sora text-sm font-bold">{formatRM(w.tips)}</div>
        </div>
      </div>
      <div className="iz-v-sum mt-2 tot">
        <span className="iz-muted">Est. payout</span>
        <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(w.estPayout)}</span>
      </div>
    </IzCard>
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
