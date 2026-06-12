import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { OUTLET_NAMES } from "@/lib/agency-demo";
import {
  computeAvailabilityStats,
  DEFAULT_ROSTER_DATE_ISO,
  getDistanceKm,
  getFreePrsWithDistances,
  getPrScheduleState,
  getPrSlotForDate,
  type FreePrWithDistances,
} from "@/lib/roster-availability";
import { IzCard, IzPill, IzSectionLabel, IzSelect, IzTimeInput } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { Check, MapPin, UserCheck, UserX, Users } from "lucide-react";
import { fmtDFriendly } from "@/lib/pr-demo";
import { OutletSection } from "@/components/outlet/OutletSection";

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return fmtDFriendly(y, m, d);
}

export function PrAvailabilityPanel({
  dateIso,
  sortByOutlet = "",
  readOnly = false,
}: {
  dateIso: string;
  sortByOutlet?: string;
  readOnly?: boolean;
}) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const [targetOutlet, setTargetOutlet] = useState(sortByOutlet || OUTLET_NAMES[0] || "Velvet 23");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (sortByOutlet) setTargetOutlet(sortByOutlet);
  }, [sortByOutlet]);

  const stats = useMemo(
    () => computeAvailabilityStats(agencyPRs, agencyRoster, dateIso),
    [agencyPRs, agencyRoster, dateIso],
  );

  const freePrs = useMemo(
    () => getFreePrsWithDistances(agencyPRs, agencyRoster, dateIso, targetOutlet || undefined),
    [agencyPRs, agencyRoster, dateIso, targetOutlet],
  );

  const selectedRows = useMemo(
    () => freePrs.filter(({ pr }) => selected.has(pr.id)),
    [freePrs, selected],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFree = () => setSelected(new Set(freePrs.map(({ pr }) => pr.id)));

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <>
      <IzSectionLabel>
        <Users className="mr-1 inline h-3.5 w-3.5" />
        Free PRs · assign to outlet · {dateIso === DEFAULT_ROSTER_DATE_ISO ? "today" : dateIso}
      </IzSectionLabel>

      <div className="iz-grid3 mb-2">
        <div className="iz-stat-tile !py-3">
          <div className="n text-[var(--iz-green)]">{stats.free}</div>
          <div className="l">Free · no shift</div>
        </div>
        <div className="iz-stat-tile !py-3">
          <div className="n">{stats.booked}</div>
          <div className="l">Booked · scheduled</div>
        </div>
        <div className="iz-stat-tile !py-3">
          <div className="n text-[var(--iz-red)]">{stats.unavailable}</div>
          <div className="l">Unavailable</div>
        </div>
      </div>

      {!readOnly && freePrs.length > 0 && (
        <IzCard flat className="!mb-3">
          <span className="iz-field-label">Target outlet</span>
          <IzSelect
            block
            className="!text-sm"
            value={targetOutlet}
            onChange={(e) => setTargetOutlet(e.target.value)}
          >
            {OUTLET_NAMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </IzSelect>
          <p className="iz-tiny iz-muted mt-1.5">
            Select PRs below · distances update for this venue · many PRs can share one outlet
          </p>
        </IzCard>
      )}

      <OutletSection
        title={`${freePrs.length} free PR${freePrs.length === 1 ? "" : "s"}`}
        hint={targetOutlet ? `Distances → ${targetOutlet}` : undefined}
        className="!mt-0"
        trailing={
          !readOnly && freePrs.length > 0 ? (
            <div className="flex gap-1.5">
              {selectMode && (
                <button type="button" className="iz-chip !text-xs" onClick={selectAllFree}>
                  All
                </button>
              )}
              <button
                type="button"
                className={`iz-chip !text-xs${selectMode ? " ring-1 ring-[var(--iz-gold)]" : ""}`}
                onClick={() => {
                  if (selectMode) exitSelect();
                  else setSelectMode(true);
                }}
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
            </div>
          ) : undefined
        }
      >
        {selectMode && freePrs.length > 0 && (
          <p className="iz-tiny iz-muted2 mb-2">
            {selected.size === 0 ? "Tap PR rows to multi-select" : `${selected.size} selected`}
          </p>
        )}

        {selectMode && selected.size > 0 && (
          <button
            type="button"
            className="iz-btn iz-btn-primary mb-2 w-full !py-2.5 !text-xs"
            onClick={() => setConfirmOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" /> Assign to {targetOutlet} ({selected.size})
          </button>
        )}

        {freePrs.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No free PRs for this date — all have shifts or are unavailable</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {freePrs.map(({ pr, distances }) => {
              const picked = selectMode && selected.has(pr.id);
              const targetKm = distances.find((d) => d.outlet === targetOutlet)?.km ?? getDistanceKm(pr.place, targetOutlet);
              return (
                <button
                  key={pr.id}
                  type="button"
                  className={`iz-outlet-floor-row w-full text-left${picked ? " ring-1 ring-[var(--iz-gold)]" : ""}`}
                  onClick={() => {
                    if (readOnly) return;
                    if (selectMode) toggleSelect(pr.id);
                    else {
                      setSelectMode(true);
                      setSelected(new Set([pr.id]));
                    }
                  }}
                  disabled={readOnly}
                >
                  {(selectMode || picked) && (
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        picked
                          ? "border-[var(--iz-gold)] bg-[var(--iz-gold)] text-[var(--iz-bg)]"
                          : "border-[var(--iz-line2)] bg-[var(--iz-bg2)]"
                      }`}
                    >
                      {picked && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(57,217,138,.15)] font-sora text-lg font-bold text-[var(--iz-green)]">
                    {pr.name.trim()[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-sora text-sm font-bold">{pr.name}</span>
                      <IzPill variant="green" className="!py-0.5 !text-[9px]">
                        Free
                      </IzPill>
                      <IzPill variant="gold" className="!py-0.5 !text-[9px]">
                        {pr.rating} ★
                      </IzPill>
                    </div>
                    <p className="iz-tiny iz-muted truncate">
                      {pr.languages.join(" · ")} · {pr.place}
                    </p>
                    <p className="iz-tiny mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--iz-gold-l)]">
                        <MapPin className="h-3 w-3" />
                        {targetOutlet} · {targetKm.toFixed(1)} km
                      </span>
                      <span className="iz-muted2">
                        {distances
                          .filter((d) => d.outlet !== targetOutlet)
                          .slice(0, 3)
                          .map((d) => `${d.outlet.split(" ")[0]} ${d.km.toFixed(1)}km`)
                          .join(" · ")}
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </OutletSection>

      <BookedPrSummary dateIso={dateIso} />

      {confirmOpen && selectedRows.length > 0 && (
        <AssignBatchSheet
          rows={selectedRows}
          targetOutlet={targetOutlet}
          dateIso={dateIso}
          onClose={() => setConfirmOpen(false)}
          onDone={() => {
            setConfirmOpen(false);
            exitSelect();
          }}
        />
      )}
    </>
  );
}

function AssignBatchSheet({
  rows,
  targetOutlet,
  dateIso,
  onClose,
  onDone,
}: {
  rows: FreePrWithDistances[];
  targetOutlet: string;
  dateIso: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const assignPrToOutlet = useStore((s) => s.assignPrToOutlet);
  const [outlet, setOutlet] = useState(targetOutlet);
  const [shiftStart, setShiftStart] = useState("22:00");
  const [shiftEnd, setShiftEnd] = useState("04:00");
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    const dateLabel = formatDateLabel(dateIso);
    for (const { pr } of rows) {
      assignPrToOutlet({
        prId: pr.id,
        outlet,
        dateIso,
        dateLabel,
        shiftStart,
        shiftEnd,
      });
    }
    setBusy(false);
    onDone();
  };

  return (
    <IzSheet open onClose={busy ? () => {} : onClose}>
      <h3 className="font-sora text-lg font-bold">Assign {rows.length} PR{rows.length === 1 ? "" : "s"}</h3>
      <p className="iz-tiny iz-muted mt-1">Same outlet &amp; shift · PR must approve each assignment</p>

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

      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--iz-line)] p-2">
        {rows.map(({ pr, distances }) => {
          const km = distances.find((d) => d.outlet === outlet)?.km ?? getDistanceKm(pr.place, outlet);
          return (
            <div key={pr.id} className="flex items-center justify-between gap-2 iz-tiny">
              <span className="font-semibold">{pr.name}</span>
              <span className="iz-muted shrink-0">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {km.toFixed(1)} km
              </span>
            </div>
          );
        })}
      </div>

      <div className="iz-sheet-actions">
        <button type="button" className="iz-btn iz-btn-soft flex-1" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="iz-btn iz-btn-primary flex-1" onClick={confirm} disabled={busy}>
          {busy ? "Assigning…" : `Confirm (${rows.length})`}
        </button>
      </div>
    </IzSheet>
  );
}

function BookedPrSummary({ dateIso }: { dateIso: string }) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const booked = agencyPRs.filter((pr) => getPrScheduleState(pr.id, agencyRoster, dateIso) === "booked");

  if (booked.length === 0) return null;

  return (
    <>
      <IzSectionLabel className="mt-4">
        <UserX className="mr-1 inline h-3.5 w-3.5" />
        Booked · time scheduled
      </IzSectionLabel>
      <div className="space-y-2">
        {booked.map((pr) => {
          const slot = getPrSlotForDate(pr.id, agencyRoster, dateIso)!;
          return (
            <IzCard key={pr.id} flat className="!py-2.5">
              <div className="iz-between">
                <div>
                  <span className="font-sora text-sm font-bold">{pr.name}</span>
                  <p className="iz-tiny iz-muted mt-0.5">{slot.outlet}</p>
                </div>
                <div className="text-right">
                  <IzPill variant="ink">
                    {slot.status === "on-duty"
                      ? "On duty"
                      : slot.status === "en-route"
                        ? "En route"
                        : slot.status === "assignment-pending"
                          ? "Awaiting PR"
                          : "Scheduled"}
                  </IzPill>
                  <p className="iz-tiny text-[var(--iz-gold-l)] mt-1">
                    {slot.shiftStart} — {slot.shiftEnd}
                  </p>
                </div>
              </div>
            </IzCard>
          );
        })}
      </div>
    </>
  );
}
