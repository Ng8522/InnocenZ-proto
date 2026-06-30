import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore, type ShiftRequest } from "@/lib/store";
import { resolveOutletShiftDateIso, outletHomeShiftRequests } from "@/lib/agency-outlet-shifts";
import { PR_AGENCY_TIED_OFFERS } from "@/lib/pr-features";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  formatShiftEventTypeSummary,
  shiftSpecialEventLabel,
} from "@/lib/outlet-demo";
import type { ShiftApplicant } from "@/lib/outlet-demo";
import type { AgencyManagedPR, AgencyRosterSlot } from "@/lib/agency-demo";
import {
  agencyNameForShift,
  buildShiftStaffRows,
  formatShiftTimeRange,
  shiftStaffingSummary,
} from "@/lib/outlet-shift-staffing";
import { isoKeyFromDate, dateFromIsoKey } from "@/components/iz/HistDateCalendar";
import { getLiveTodayIso } from "@/lib/demo-clock";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import {
  OutletShiftDetailPanel,
  OutletShiftStatusBadge,
} from "@/components/outlet/OutletShiftDetailPanel";
import { OutletShiftStaffingSection } from "@/components/outlet/OutletShiftStaffingSection";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarEvent = {
  shift: ShiftRequest;
  dateIso: string;
  timeRange: string;
  eventType: string;
  demand: number;
  supplied: number;
  pendingCount: number;
  agencyLabel: string;
  bookedNames: string;
};

function buildCalendarEvents(
  shifts: ShiftRequest[],
  roster: AgencyRosterSlot[],
  agencyPRs: AgencyManagedPR[],
  shiftApplicants: ShiftApplicant[],
  todayIso: string,
): CalendarEvent[] {
  return shifts
    .map((shift) => {
      const dateIso = resolveOutletShiftDateIso(shift.date, shift.dateIso, todayIso);
      const agencyName = agencyNameForShift(shift, roster, dateIso);
      const { demand, supplied, pendingCount } = shiftStaffingSummary(shift, shiftApplicants);
      const { booked } = buildShiftStaffRows({
        shift,
        dateIso,
        agencyPRs,
        agencyRoster: roster,
        shiftApplicants,
        agencyName,
      });
      const bookedNames =
        booked.length === 0
          ? "No PRs booked"
          : booked.map((r) => r.name).join(", ");

      return {
        shift,
        dateIso,
        timeRange: formatShiftTimeRange(shift.shift),
        eventType: formatShiftEventTypeSummary(
          shift.eventKind ?? "normal",
          shift.specialEventType,
          shift.customSpecialEventName,
        ),
        demand,
        supplied,
        pendingCount,
        agencyLabel: agencyName,
        bookedNames,
      };
    })
    .sort((a, b) => {
      const dateCmp = a.dateIso.localeCompare(b.dateIso);
      if (dateCmp !== 0) return dateCmp;
      return a.timeRange.localeCompare(b.timeRange);
    });
}

function statusEventClass(status: ShiftRequest["status"]) {
  if (status === "confirmed") return "iz-outlet-ops-cal-event--live";
  if (status === "open") return "iz-outlet-ops-cal-event--open";
  if (status === "sealed") return "iz-outlet-ops-cal-event--sealed";
  return "iz-outlet-ops-cal-event--draft";
}

export function OutletOperationsCalendar() {
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shiftApplicants = useStore((s) => s.shiftApplicants);
  const { shifts, deleteShift } = useStore();

  const todayIso = getLiveTodayIso();
  const [viewMonth, setViewMonth] = useState(() => dateFromIsoKey(todayIso) ?? new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const visibleShifts = useMemo(
    () =>
      outletHomeShiftRequests({
        shifts,
        outletName: outletWorkspace.outletName,
        roster: agencyRoster,
        tiedOffers: PR_AGENCY_TIED_OFFERS,
        commissionRules: outletCommissionRules,
        outletWorkspace,
        todayIso: DEFAULT_ROSTER_DATE_ISO,
      }),
    [shifts, outletWorkspace, agencyRoster, outletCommissionRules],
  );

  const liveShift =
    visibleShifts.find((s) => s.status === "confirmed" && s.date === "Tonight") ??
    visibleShifts.find((s) => s.status === "confirmed");
  const calendarShifts = liveShift
    ? visibleShifts.filter((s) => s.id !== liveShift.id)
    : visibleShifts;

  const events = useMemo(
    () =>
      buildCalendarEvents(
        calendarShifts,
        agencyRoster,
        agencyPRs,
        shiftApplicants,
        DEFAULT_ROSTER_DATE_ISO,
      ),
    [calendarShifts, agencyRoster, agencyPRs, shiftApplicants],
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (map[ev.dateIso] ??= []).push(ev);
    }
    return map;
  }, [events]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const selectedShift = selectedShiftId
    ? calendarShifts.find((s) => s.id === selectedShiftId) ?? null
    : null;
  const deleteTarget = deleteTargetId
    ? calendarShifts.find((s) => s.id === deleteTargetId) ?? null
    : null;

  if (calendarShifts.length === 0) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No upcoming shifts — use Post Job to create one.
      </p>
    );
  }

  return (
    <>
      <div className="iz-outlet-ops-cal">
        <div className="iz-outlet-ops-cal-toolbar">
          <button
            type="button"
            className="iz-chip !px-3 !py-1.5 text-xs font-semibold"
            onClick={() => setViewMonth(dateFromIsoKey(todayIso) ?? new Date())}
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="iz-topbar-action h-8 w-8"
              aria-label="Previous month"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="iz-topbar-action h-8 w-8"
              aria-label="Next month"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-sora flex-1 text-center text-sm font-bold text-[var(--iz-txt)] sm:text-base">
            {format(viewMonth, "MMMM yyyy")}
          </h3>
          <div className="hidden text-[10px] text-[var(--iz-muted2)] sm:block">
            {events.length} shifts booked
          </div>
        </div>

        <div className="iz-outlet-ops-cal-weekdays">
          {WEEKDAYS.map((d) => (
            <div key={d} className="iz-outlet-ops-cal-weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="iz-outlet-ops-cal-grid">
          {gridDays.map((day) => {
            const iso = isoKeyFromDate(day);
            const dayEvents = eventsByDate[iso] ?? [];
            const inMonth = isSameMonth(day, viewMonth);
            const today = isToday(day);

            return (
              <div
                key={iso}
                className={cn(
                  "iz-outlet-ops-cal-cell",
                  !inMonth && "iz-outlet-ops-cal-cell--outside",
                  today && "iz-outlet-ops-cal-cell--today",
                )}
              >
                <div className="iz-outlet-ops-cal-cell-head">
                  <span
                    className={cn(
                      "iz-outlet-ops-cal-day-num",
                      today && "iz-outlet-ops-cal-day-num--today",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="iz-outlet-ops-cal-events">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.shift.id}
                      type="button"
                      className={cn("iz-outlet-ops-cal-event", statusEventClass(ev.shift.status))}
                      onClick={() => setSelectedShiftId(ev.shift.id)}
                    >
                      <span className="iz-outlet-ops-cal-event-time">{ev.timeRange}</span>
                      <span className="iz-outlet-ops-cal-event-title">{ev.shift.event}</span>
                      <span className="iz-outlet-ops-cal-event-meta">
                        {ev.eventType}
                      </span>
                      <span className="iz-outlet-ops-cal-event-stats">
                        {ev.supplied}/{ev.demand} booked
                        {ev.pendingCount > 0 ? ` · ${ev.pendingCount} applied` : ""}
                      </span>
                      <span className="iz-outlet-ops-cal-event-agency">{ev.agencyLabel}</span>
                      <span className="iz-outlet-ops-cal-event-pr">{ev.bookedNames}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="iz-outlet-ops-cal-legend">
          <span>
            <i className="sw open" /> Open shift
          </span>
          <span>
            <i className="sw live" /> Live
          </span>
          <span>
            <i className="sw draft" /> Draft
          </span>
        </div>
      </div>

      <IzSheet
        open={selectedShift !== null}
        onClose={() => setSelectedShiftId(null)}
        variant="dialog"
        wide
      >
        {selectedShift && (() => {
          const dateIso = resolveOutletShiftDateIso(
            selectedShift.date,
            selectedShift.dateIso,
            DEFAULT_ROSTER_DATE_ISO,
          );
          const linkedAgency = agencyNameForShift(selectedShift, agencyRoster, dateIso);
          return (
          <>
            <div className="flex items-start gap-2 pr-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="iz-cardttl truncate">{selectedShift.event}</div>
                  {selectedShift.eventKind === "special" && (
                    <IzPill variant="gold" className="shrink-0 !py-0.5 !text-[9px]">
                      {shiftSpecialEventLabel(
                        selectedShift.specialEventType,
                        selectedShift.customSpecialEventName,
                      )}
                    </IzPill>
                  )}
                  <OutletShiftStatusBadge shift={selectedShift} />
                </div>
                <p className="iz-tiny iz-muted2 mt-1">
                  {selectedShift.date} · {formatShiftTimeRange(selectedShift.shift)}
                </p>
                <p className="iz-tiny iz-muted2 mt-0.5">
                  Agency · {linkedAgency}
                </p>
              </div>
            </div>
            <div className="mt-3 px-1">
              <OutletShiftStaffingSection shift={selectedShift} />
            </div>
            <OutletShiftDetailPanel
              shift={selectedShift}
              variant="future"
              hideLogSales
              staffingAgency={linkedAgency}
              onDelete={() => {
                setSelectedShiftId(null);
                setDeleteTargetId(selectedShift.id);
              }}
            />
          </>
          );
        })()}
      </IzSheet>

      <IzSheet open={deleteTarget !== null} onClose={() => setDeleteTargetId(null)}>
        <div className="iz-cardttl">Delete this shift?</div>
        {deleteTarget && (
          <IzCard flat className="mt-2">
            <p className="text-sm font-semibold">{deleteTarget.event}</p>
            <p className="iz-tiny iz-muted mt-1">
              {deleteTarget.date} · {deleteTarget.shift}
            </p>
          </IzCard>
        )}
        <button
          type="button"
          className="iz-btn iz-btn-danger mt-3 w-full"
          onClick={() => {
            if (deleteTargetId) deleteShift(deleteTargetId);
            setDeleteTargetId(null);
          }}
        >
          Delete shift
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => setDeleteTargetId(null)}
        >
          Cancel
        </button>
      </IzSheet>
    </>
  );
}
