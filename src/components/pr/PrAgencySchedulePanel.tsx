import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { IzSheet } from "@/components/iz/Sheet";
import { PrStatusPill } from "@/components/pr/PrOfferRow";
import type { AgencyRosterSlot } from "@/lib/agency-demo";
import {
  AGENCY_SCHEDULE_FROM_ISO,
  AGENCY_SCHEDULE_TO_ISO,
  buildPrScheduleDays,
  buildTimetableEntries,
  dayCanToggleAvailability,
  entryCanCancel,
  entryCanDecline,
  type PrScheduleDay,
  type ShiftDataSource,
  type TimetableEntry,
} from "@/lib/pr-agency-schedule";
import { PAYROLL_CYCLE } from "@/lib/pr-demo";
import type { PrUpcomingShift } from "@/lib/pr-features";
import {
  CANCELLATION_RULE_SUMMARY,
  CANCEL_RULES,
  evaluateShiftCancellation,
} from "@/lib/pr-schedule-cancellation";
import { calendarNavBounds, dateFromIsoKey, isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import { cn } from "@/lib/utils";
import { AlertTriangle, Building2, CalendarDays, ChevronDown, Clock, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const KIND_LABEL: Record<PrScheduleDay["kind"], string> = {
  past: "Past",
  open: "Open",
  unavailable: "Unavailable",
  assigned: "Scheduled",
  pending: "Pending",
  active: "On duty",
};

const KIND_PILL: Record<PrScheduleDay["kind"], "green" | "amber" | "red" | "ink"> = {
  past: "ink",
  open: "ink",
  unavailable: "red",
  assigned: "green",
  pending: "amber",
  active: "green",
};

export function PrAgencySchedulePanel({
  prId,
  roster,
  upcoming,
  onToggleAvailability,
  onCancelShift,
  onDeclineAssignment,
}: {
  prId: string;
  roster: AgencyRosterSlot[];
  upcoming: PrUpcomingShift[];
  onToggleAvailability: (dateIso: string) => void;
  onCancelShift: (slotId: string) => void;
  onDeclineAssignment: (slotId: string) => void;
}) {
  const scheduleDays = useMemo(
    () => buildPrScheduleDays(prId, roster, upcoming),
    [prId, roster, upcoming],
  );
  const dayByIso = useMemo(() => new Map(scheduleDays.map((d) => [d.dateIso, d])), [scheduleDays]);

  const defaultMonth = dateFromIsoKey("2026-06-01") ?? new Date();
  const [viewMonth, setViewMonth] = useState(defaultMonth);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [cancelSlotId, setCancelSlotId] = useState<string | null>(null);

  const navBounds = useMemo(
    () =>
      calendarNavBounds(
        scheduleDays.map((d) => ({ key: d.dateIso })),
        defaultMonth,
      ),
    [scheduleDays, defaultMonth],
  );

  useEffect(() => {
    setViewMonth((m) => {
      if (m >= navBounds.startMonth && m <= navBounds.endMonth) return m;
      return defaultMonth;
    });
  }, [navBounds, defaultMonth]);

  const minY = navBounds.startMonth.getFullYear();
  const maxY = navBounds.endMonth.getFullYear();
  const years = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);

  const timetableEntries = useMemo(
    () => buildTimetableEntries(prId, roster, upcoming, viewMonth),
    [prId, roster, upcoming, viewMonth],
  );

  const selectedDay = selectedIso ? dayByIso.get(selectedIso) : undefined;
  const cancelSlot = cancelSlotId ? roster.find((s) => s.id === cancelSlotId) : undefined;
  const cancelEval =
    cancelSlot &&
    evaluateShiftCancellation(
      new Date(),
      cancelSlot.dateIso,
      cancelSlot.shiftStart,
      cancelSlot.estPayout ?? CANCEL_RULES.defaultDailyWagesRm,
    );

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = isoKeyFromDate(date);
    const day = dayByIso.get(iso);
    if (!day || day.kind === "past") return;

    if (dayCanToggleAvailability(day)) {
      onToggleAvailability(iso);
      setSelectedIso(null);
      return;
    }

    setSelectedIso(iso);
  };

  return (
    <div className="iz-pr-schedule">
      <div className="iz-pr-schedule-rules">
        <button
          type="button"
          className="iz-pr-schedule-rules-hd"
          onClick={() => setRulesOpen((o) => !o)}
          aria-expanded={rulesOpen}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
          <span className="text-left">
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--iz-txt)]">
              Cancellation rules
            </span>
            <span className="iz-tiny iz-muted2">Shift cancel &amp; lateness · Atlas payroll cycle</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", rulesOpen && "rotate-180")} />
        </button>
        {rulesOpen && (
          <ul className="iz-pr-schedule-rules-list">
            {CANCELLATION_RULE_SUMMARY.map((r) => (
              <li key={r.label} className={`tone-${r.tone}`}>
                <span className="rule-when">{r.label}</span>
                <span className="rule-out">{r.outcome}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="iz-tiny iz-muted2 mb-2 px-0.5">
        Agency schedule · {PAYROLL_CYCLE.range}. Tap <b>open</b> → not available (red). Tap <b>red</b> again → open. Syncs to Atlas &amp; outlets instantly.
      </p>

      <div className="iz-pr-schedule-cal-wrap">
        <div className="iz-hist-cal-nav mb-2">
          <label className="iz-hist-cal-nav-field">
            <span className="iz-hist-cal-nav-label">Month</span>
            <span className="iz-hist-cal-select-wrap">
              <select
                className="iz-hist-cal-select"
                value={viewMonth.getMonth()}
                aria-label="Choose month"
                onChange={(e) =>
                  setViewMonth(new Date(viewMonth.getFullYear(), Number(e.target.value), 1))
                }
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="iz-hist-cal-select-icon" aria-hidden />
            </span>
          </label>
          <label className="iz-hist-cal-nav-field">
            <span className="iz-hist-cal-nav-label">Year</span>
            <span className="iz-hist-cal-select-wrap">
              <select
                className="iz-hist-cal-select"
                value={viewMonth.getFullYear()}
                aria-label="Choose year"
                onChange={(e) =>
                  setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1))
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="iz-hist-cal-select-icon" aria-hidden />
            </span>
          </label>
        </div>
        <CalendarUi
          mode="single"
          hideNavigation
          month={viewMonth}
          onMonthChange={setViewMonth}
          startMonth={navBounds.startMonth}
          endMonth={navBounds.endMonth}
          selected={undefined}
          onSelect={handleDaySelect}
          disabled={(date) => {
            const iso = isoKeyFromDate(date);
            if (iso < AGENCY_SCHEDULE_FROM_ISO || iso > AGENCY_SCHEDULE_TO_ISO) return true;
            const day = dayByIso.get(iso);
            return day?.kind === "past";
          }}
          modifiers={{
            open: (d) => dayByIso.get(isoKeyFromDate(d))?.kind === "open",
            assigned: (d) => dayByIso.get(isoKeyFromDate(d))?.kind === "assigned",
            pending: (d) => dayByIso.get(isoKeyFromDate(d))?.kind === "pending",
            unavailable: (d) => dayByIso.get(isoKeyFromDate(d))?.kind === "unavailable",
            active: (d) => dayByIso.get(isoKeyFromDate(d))?.kind === "active",
            picked: (d) => selectedIso === isoKeyFromDate(d),
          }}
          modifiersClassNames={{
            open: "iz-pr-cal-open",
            assigned: "iz-pr-cal-assigned",
            pending: "iz-pr-cal-pending",
            unavailable: "iz-pr-cal-unavailable",
            active: "iz-pr-cal-active",
            picked: "iz-pr-cal-picked",
          }}
          classNames={{
            month_caption: "hidden",
            nav: "hidden",
            root: "iz-pr-schedule-cal",
            month: "w-full",
            weekdays: "iz-pr-cal-weekdays",
            week: "iz-pr-cal-week",
            day: "iz-pr-cal-day",
            day_button: "iz-pr-cal-day-btn",
          }}
          className="w-full p-0"
        />
        <div className="iz-pr-cal-legend">
          <span><i className="sw open" /> Open</span>
          <span><i className="sw assigned" /> Scheduled</span>
          <span><i className="sw pending" /> Pending</span>
          <span><i className="sw unavailable" /> Not available</span>
        </div>
      </div>

      <div className="iz-pr-schedule-timetable">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--iz-muted2)]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--iz-muted)]">Timetable</span>
          </div>
          <span className="iz-tiny iz-muted2">Source: Atlas Agency or outlet roster</span>
        </div>
        {timetableEntries.length === 0 ? (
          <p className="iz-tiny iz-muted2 rounded-xl border border-dashed border-[var(--iz-line)] px-3 py-5 text-center">
            No assigned shifts this month — mark open days you cannot work.
          </p>
        ) : (
          <div className="iz-pr-list">
            {timetableEntries.map((entry) => (
              <TimetableRow
                key={entry.id}
                entry={entry}
                onDecline={() => entry.slot && onDeclineAssignment(entry.slot.id)}
                onCancel={() => entry.slot && setCancelSlotId(entry.slot.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDay && selectedDay.kind !== "past" && !dayCanToggleAvailability(selectedDay) && (
        <p className="iz-tiny iz-muted2 mt-2 text-center">
          {selectedDay.label}: <b>{KIND_LABEL[selectedDay.kind]}</b> — cancel or decline shifts before marking unavailable
        </p>
      )}

      <IzSheet open={cancelSlotId !== null} onClose={() => setCancelSlotId(null)}>
        {cancelSlot && cancelEval && (
          <>
            <div className="iz-cardttl">Cancel {cancelSlot.outlet}?</div>
            <p className="iz-tiny iz-muted mb-1">
              {cancelSlot.date} · {cancelSlot.shift}
            </p>
            <div
              className={cn(
                "mb-3 rounded-xl border px-3 py-2.5",
                cancelEval.tier === "safe"
                  ? "border-[rgba(74,222,128,.35)] bg-[rgba(74,222,128,.08)]"
                  : cancelEval.tier === "short_notice"
                    ? "border-[rgba(244,183,64,.35)] bg-[rgba(244,183,64,.08)]"
                    : "border-[rgba(255,107,107,.35)] bg-[rgba(255,107,107,.08)]",
              )}
            >
              <p className="text-sm font-semibold">{cancelEval.headline}</p>
              <p className="iz-tiny iz-muted2 mt-1">{cancelEval.detail}</p>
            </div>
            <button
              type="button"
              className="iz-btn iz-btn-danger w-full"
              onClick={() => {
                onCancelShift(cancelSlot.id);
                setCancelSlotId(null);
              }}
            >
              {cancelEval.deductionRm > 0
                ? `Cancel & accept −RM ${cancelEval.deductionRm}`
                : "Cancel shift"}
            </button>
          </>
        )}
      </IzSheet>
    </div>
  );
}

function SourceBadge({ source, label }: { source: ShiftDataSource; label: string }) {
  const isAgency = source === "agency";
  return (
    <span className={cn("iz-pr-source-badge", isAgency ? "is-agency" : "is-outlet")}>
      {isAgency ? <Shield className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
      {isAgency ? "Agency" : "Outlet"} · {label}
    </span>
  );
}

function TimetableRow({
  entry,
  onDecline,
  onCancel,
}: {
  entry: TimetableEntry;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const slot = entry.slot;

  return (
    <div className="iz-pr-inbox-card !py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <SourceBadge source={entry.source} label={entry.sourceLabel} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--iz-muted2)]" />
            <span className="font-sora text-sm font-bold">{entry.outlet}</span>
            <PrStatusPill variant={entry.statusVariant}>{entry.statusLabel}</PrStatusPill>
          </div>
          <p className="iz-tiny iz-muted2 mt-1">
            {entry.dateLabel} · {entry.time}
          </p>
          <p className="iz-tiny iz-muted mt-1 leading-snug">{entry.sourceDetail}</p>
          {slot?.payDeductionRm ? (
            <p className="iz-tiny mt-1 text-[var(--iz-red)]">
              −RM {slot.payDeductionRm} logged · {slot.cancelledAt}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {entryCanDecline(entry) && (
          <button type="button" className="iz-btn iz-btn-soft iz-btn-sm" onClick={onDecline}>
            Decline assignment
          </button>
        )}
        {entryCanCancel(entry) && entry.slot && (
          <button
            type="button"
            className="iz-btn iz-btn-ghost iz-btn-sm !text-[var(--iz-red)]"
            onClick={onCancel}
          >
            Cancel shift
          </button>
        )}
      </div>
    </div>
  );
}
