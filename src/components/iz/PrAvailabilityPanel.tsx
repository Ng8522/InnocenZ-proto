import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { OUTLET_NAMES } from "@/lib/agency-demo";
import {
  computeAvailabilityStats,
  DEFAULT_ROSTER_DATE_ISO,
  getFreePrsWithDistances,
  getPrScheduleState,
  getPrSlotForDate,
  type FreePrWithDistances,
} from "@/lib/roster-availability";
import { IzCard, IzPill, IzSectionLabel, IzSelect, IzTimeInput } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { MapPin, Navigation, UserCheck, UserX, Users } from "lucide-react";
import { fmtDFriendly } from "@/lib/pr-demo";

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return fmtDFriendly(y, m, d);
}

export function PrAvailabilityPanel({
  dateIso,
  sortByOutlet,
}: {
  dateIso: string;
  sortByOutlet: string;
}) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const [assignPr, setAssignPr] = useState<FreePrWithDistances | null>(null);

  const stats = useMemo(
    () => computeAvailabilityStats(agencyPRs, agencyRoster, dateIso),
    [agencyPRs, agencyRoster, dateIso],
  );

  const freePrs = useMemo(
    () => getFreePrsWithDistances(agencyPRs, agencyRoster, dateIso, sortByOutlet || undefined),
    [agencyPRs, agencyRoster, dateIso, sortByOutlet],
  );

  return (
    <>
      <IzSectionLabel>
        <Users className="mr-1 inline h-3.5 w-3.5" />
        PR availability · {dateIso === DEFAULT_ROSTER_DATE_ISO ? "today" : dateIso}
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

      <IzCard flat className="!mb-3">
        <p className="iz-tiny iz-muted">
          {stats.total} PRs on roster · {stats.free} available to assign to outlets with nothing scheduled
        </p>
      </IzCard>

      {freePrs.length === 0 ? (
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">No free PRs for this date — all have shifts or are unavailable</p>
        </IzCard>
      ) : (
        <div className="space-y-2.5">
          {freePrs.map(({ pr, distances }) => (
            <IzCard key={pr.id} className="border-[rgba(57,217,138,.2)]">
              <div className="iz-between">
                <div>
                  <div className="font-sora text-[15px] font-bold">{pr.name}</div>
                  <p className="iz-tiny iz-muted mt-0.5">
                    {pr.place} · {pr.rating} ★ · {pr.languages.slice(0, 2).join(", ")}
                  </p>
                </div>
                <IzPill variant="green">Free</IzPill>
              </div>
              <p className="iz-tiny iz-muted2 mt-2 flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                Distance to outlets (km)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {distances.map((d) => (
                  <span
                    key={d.outlet}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                      sortByOutlet === d.outlet
                        ? "border-[var(--iz-gold)] bg-[rgba(217,185,122,.12)] text-[var(--iz-gold-l)]"
                        : "border-[var(--iz-line)] text-[var(--iz-muted)]"
                    }`}
                  >
                    {d.outlet} {d.km.toFixed(1)} km
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="iz-btn iz-btn-primary mt-2.5 w-full !py-2 !text-xs"
                onClick={() => setAssignPr({ pr, distances })}
              >
                <UserCheck className="h-3.5 w-3.5" /> Assign to outlet
              </button>
            </IzCard>
          ))}
        </div>
      )}

      <BookedPrSummary dateIso={dateIso} />

      {assignPr && (
        <AssignPrSheet
          pr={assignPr.pr}
          distances={assignPr.distances}
          dateIso={dateIso}
          onClose={() => setAssignPr(null)}
        />
      )}
    </>
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
                  <IzPill variant="ink">{slot.status === "on-duty" ? "On duty" : slot.status === "en-route" ? "En route" : "Scheduled"}</IzPill>
                  <p className="iz-tiny text-[var(--iz-gold-l)] mt-1">{slot.shiftStart} — {slot.shiftEnd}</p>
                </div>
              </div>
            </IzCard>
          );
        })}
      </div>
    </>
  );
}

function AssignPrSheet({
  pr,
  distances,
  dateIso,
  onClose,
}: {
  pr: FreePrWithDistances["pr"];
  distances: FreePrWithDistances["distances"];
  dateIso: string;
  onClose: () => void;
}) {
  const assignPrToOutlet = useStore((s) => s.assignPrToOutlet);
  const [outlet, setOutlet] = useState(distances[0]?.outlet ?? OUTLET_NAMES[0]);
  const [shiftStart, setShiftStart] = useState("22:00");
  const [shiftEnd, setShiftEnd] = useState("04:00");

  const selectedDist = distances.find((d) => d.outlet === outlet);

  return (
    <IzSheet open onClose={onClose}>
      <h3 className="font-sora text-lg font-bold">Assign {pr.name}</h3>
      <p className="iz-tiny iz-muted mt-1">Free PR → outlet shift · no other booking this day</p>

      <div className="mt-3">
        <span className="iz-field-label">Outlet</span>
        <IzSelect block className="!text-sm" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
          {distances.map((d) => (
            <option key={d.outlet} value={d.outlet}>
              {d.outlet} · {d.km.toFixed(1)} km
            </option>
          ))}
        </IzSelect>
        {selectedDist && (
          <p className="iz-tiny iz-muted2 mt-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {selectedDist.km.toFixed(1)} km from {pr.place}
          </p>
        )}
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

      <div className="iz-sheet-actions">
        <button type="button" className="iz-btn iz-btn-soft flex-1" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-primary flex-1"
          onClick={() => {
            assignPrToOutlet({
              prId: pr.id,
              outlet,
              dateIso,
              dateLabel: formatDateLabel(dateIso),
              shiftStart,
              shiftEnd,
            });
            onClose();
          }}
        >
          Confirm assign
        </button>
      </div>
    </IzSheet>
  );
}
