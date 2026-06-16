import { useMemo, useState } from "react";
import type { AgencyManagedPR, AgencyRosterSlot, RosterSlotStatus } from "@/lib/agency-demo";
import { OUTLET_NAMES } from "@/lib/agency-demo";
import { isFreelancerPrId } from "@/lib/pr-demo";
import {
  dayColumnLabel,
  slotForPrOnDate,
  weekDayIsos,
  weekRangeLabel,
} from "@/lib/roster-week-plan";
import { getPrScheduleState } from "@/lib/roster-availability";
import type { RosterTimetableFilterState } from "@/lib/roster-shift-filters";
import {
  filterTimetablePrs,
  rosterShiftFiltersActive,
  timetableSlotMatches,
} from "@/lib/roster-shift-filters";
import { useStore } from "@/lib/store";
import { IzPill, IzSelect, IzTimeInput } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { fmtDFriendly } from "@/lib/pr-demo";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const STATUS_CELL: Record<
  RosterSlotStatus,
  { className: string; label: string }
> = {
  scheduled: { className: "iz-roster-week-cell--scheduled", label: "Scheduled" },
  "assignment-pending": { className: "iz-roster-week-cell--pending", label: "Awaiting PR" },
  "outlet-pending": { className: "iz-roster-week-cell--pending", label: "Awaiting outlet" },
  "on-duty": { className: "iz-roster-week-cell--live", label: "On duty" },
  "en-route": { className: "iz-roster-week-cell--live", label: "En route" },
  "swap-pending": { className: "iz-roster-week-cell--swap", label: "Swap" },
  unavailable: { className: "iz-roster-week-cell--off", label: "Off" },
};

type AssignTarget = { pr: AgencyManagedPR; dateIso: string };

type RosterWeeklyTimetableProps = {
  weekStartIso: string;
  roster: AgencyRosterSlot[];
  agencyPRs: AgencyManagedPR[];
  filters: RosterTimetableFilterState;
  canAssign: boolean;
  onEditSlot: (slotId: string) => void;
  onWeekChange: (anchorDateIso: string) => void;
};

export function RosterWeeklyTimetable({
  weekStartIso,
  roster,
  agencyPRs,
  filters,
  canAssign,
  onEditSlot,
  onWeekChange,
}: RosterWeeklyTimetableProps) {
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  const days = useMemo(() => weekDayIsos(weekStartIso), [weekStartIso]);
  const slotFiltersOn = rosterShiftFiltersActive(filters);

  const prRows = useMemo(
    () =>
      filterTimetablePrs(agencyPRs, roster, days, filters, (prId, dateIso) =>
        getPrScheduleState(prId, roster, dateIso),
      ).sort((a, b) => {
        const af = isFreelancerPrId(a.id) ? 1 : 0;
        const bf = isFreelancerPrId(b.id) ? 1 : 0;
        if (af !== bf) return af - bf;
        return a.name.localeCompare(b.name);
      }),
    [agencyPRs, roster, days, filters],
  );

  const weekLabel = weekRangeLabel(weekStartIso);

  return (
    <>
      <div className="iz-roster-week-head">
        <button
          type="button"
          className="iz-roster-week-nav"
          aria-label="Previous week"
          onClick={() => onWeekChange(shiftWeekAnchor(weekStartIso, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 text-center">
          <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">Week · {weekLabel}</p>
          <p className="iz-tiny iz-muted">Tap a cell to assign · agency-tied &amp; freelancer PRs</p>
        </div>
        <button
          type="button"
          className="iz-roster-week-nav"
          aria-label="Next week"
          onClick={() => onWeekChange(shiftWeekAnchor(weekStartIso, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="iz-roster-week-scroll">
        <table className="iz-roster-week-table">
          <thead>
            <tr>
              <th className="iz-roster-week-pr-col">PR</th>
              {days.map((dateIso) => {
                const { dow, dom } = dayColumnLabel(dateIso);
                return (
                  <th key={dateIso} className="iz-roster-week-day-col">
                    <span className="dow">{dow}</span>
                    <span className="dom">{dom}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {prRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="iz-roster-week-empty">
                  No PRs match these filters · clear or widen your search
                </td>
              </tr>
            ) : (
            prRows.map((pr) => (
              <tr key={pr.id}>
                <th scope="row" className="iz-roster-week-pr">
                  <span className="name">{pr.name}</span>
                  <span className="meta">
                    {isFreelancerPrId(pr.id) ? (
                      <IzPill variant="violet" className="!py-0 !text-[8px]">
                        Freelancer
                      </IzPill>
                    ) : (
                      <IzPill variant="ink" className="!py-0 !text-[8px]">
                        Agency
                      </IzPill>
                    )}
                    <span className="rating">{pr.rating}★</span>
                  </span>
                </th>
                {days.map((dateIso) => {
                  const slot = slotForPrOnDate(roster, pr.id, dateIso);
                  const state = getPrScheduleState(pr.id, roster, dateIso);
                  const canAssignCell = canAssign && state === "free";
                  const slotHidden = slot && slotFiltersOn && !timetableSlotMatches(slot, filters);

                  if (!slot || slotHidden) {
                    return (
                      <td key={dateIso} className="iz-roster-week-td">
                        <button
                          type="button"
                          className={`iz-roster-week-cell iz-roster-week-cell--empty${slotHidden ? " iz-roster-week-cell--filtered" : ""}`}
                          disabled={!canAssignCell}
                          onClick={() => canAssignCell && setAssignTarget({ pr, dateIso })}
                          aria-label={`Assign ${pr.name} on ${dateIso}`}
                        >
                          {canAssignCell ? <Plus className="h-4 w-4" /> : <span className="dash">—</span>}
                        </button>
                      </td>
                    );
                  }

                  const tone = STATUS_CELL[slot.status] ?? STATUS_CELL.scheduled;
                  return (
                    <td key={dateIso} className="iz-roster-week-td">
                      <button
                        type="button"
                        className={`iz-roster-week-cell iz-roster-week-cell--filled ${tone.className}`}
                        onClick={() => canAssign && onEditSlot(slot.id)}
                        disabled={!canAssign}
                        aria-label={`${canAssign ? "Edit" : "View"} ${pr.name} at ${slot.outlet}`}
                      >
                        <span className="outlet">{slot.outlet}</span>
                        <span className="shift">{slot.shiftStart}–{slot.shiftEnd}</span>
                        <span className="status">{tone.label}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <AssignWeekCellSheet
          pr={assignTarget.pr}
          dateIso={assignTarget.dateIso}
          onClose={() => setAssignTarget(null)}
          onDone={() => setAssignTarget(null)}
        />
      )}
    </>
  );
}

function shiftWeekAnchor(weekStartIso: string, delta: number): string {
  const [y, m, d] = weekStartIso.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta * 7);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return fmtDFriendly(y, m, d);
}

function AssignWeekCellSheet({
  pr,
  dateIso,
  onClose,
  onDone,
}: {
  pr: AgencyManagedPR;
  dateIso: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const assignPrToOutlet = useStore((s) => s.assignPrToOutlet);
  const [outlet, setOutlet] = useState(OUTLET_NAMES[0] ?? "Velvet 23");
  const [shiftStart, setShiftStart] = useState("22:00");
  const [shiftEnd, setShiftEnd] = useState("04:00");
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    assignPrToOutlet({
      prId: pr.id,
      outlet,
      dateIso,
      dateLabel: formatDateLabel(dateIso),
      shiftStart,
      shiftEnd,
    });
    setBusy(false);
    onDone();
  };

  return (
    <IzSheet open onClose={busy ? () => {} : onClose}>
      <h3 className="font-sora text-lg font-bold">Assign shift</h3>
      <p className="iz-tiny iz-muted mt-1">
        <strong className="text-[var(--iz-txt)]">{pr.name}</strong>
        {isFreelancerPrId(pr.id) ? " · Freelancer" : " · Agency-tied"} · {formatDateLabel(dateIso)}
      </p>
      <p className="iz-tiny iz-muted2 mt-1">PR must approve before the shift locks on their portal.</p>

      <div className="mt-3">
        <span className="iz-field-label">Outlet</span>
        <IzSelect block className="!text-sm" value={outlet} onChange={(e) => setOutlet(e.target.value)} disabled={busy}>
          {OUTLET_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </IzSelect>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <span className="iz-field-label">Start</span>
          <IzTimeInput value={shiftStart} onChange={setShiftStart} aria-label="Shift start time" />
        </div>
        <div>
          <span className="iz-field-label">End</span>
          <IzTimeInput value={shiftEnd} onChange={setShiftEnd} aria-label="Shift end time" />
        </div>
      </div>

      <button type="button" className="iz-btn iz-btn-primary mt-4 w-full" disabled={busy} onClick={confirm}>
        {busy ? "Assigning…" : "Send assignment to PR"}
      </button>
    </IzSheet>
  );
}
