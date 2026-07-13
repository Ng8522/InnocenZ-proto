import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { IzCard, IzPill } from "@/components/iz/ui";
import { GpsRoadMap } from "@/components/agency/GpsRoadMap";
import type { AgencyManagedPR, AgencyRosterSlot } from "@/lib/agency-demo";
import {
  buildGpsTrackingRows,
  gpsMapBounds,
  mapsUrlForCoord,
  OUTLET_GPS,
  uniqueOutletPins,
} from "@/lib/gps-locations";
import { getPrRosterId } from "@/lib/pr-demo";
import { cn } from "@/lib/utils";

export function AgencyGpsPanel({
  roster,
  agencyPRs,
  dateIso,
  prCheckInMeta,
  prSubRole,
}: {
  roster: AgencyRosterSlot[];
  agencyPRs: AgencyManagedPR[];
  dateIso: string;
  prCheckInMeta?: { gpsFallback?: boolean };
  prSubRole?: "pr_tied" | null;
}) {
  const activePrId = prSubRole ? getPrRosterId(prSubRole) : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outletFilter, setOutletFilter] = useState<string | null>(null);

  const rows = useMemo(
    () => buildGpsTrackingRows(roster, agencyPRs, dateIso, prCheckInMeta, activePrId),
    [roster, agencyPRs, dateIso, prCheckInMeta, activePrId],
  );

  const outletOptions = useMemo(
    () => [...new Set(rows.map((r) => r.outlet))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (!outletFilter) return rows;
    return rows.filter((r) => r.outlet === outletFilter);
  }, [rows, outletFilter]);

  useEffect(() => {
    if (outletFilter && !outletOptions.includes(outletFilter)) {
      setOutletFilter(null);
    }
  }, [outletFilter, outletOptions]);

  useEffect(() => {
    if (selectedId && !filteredRows.some((r) => r.slotId === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredRows, selectedId]);

  const bounds = useMemo(() => gpsMapBounds(filteredRows), [filteredRows]);
  const outletPins = useMemo(() => uniqueOutletPins(filteredRows), [filteredRows]);
  const inRangeCount = filteredRows.filter((r) => r.inRange).length;
  const groupedByOutlet = useMemo(() => {
    const map = new Map<string, typeof filteredRows>();
    for (const row of filteredRows) {
      const list = map.get(row.outlet) ?? [];
      list.push(row);
      map.set(row.outlet, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRows]);
  const mapHeight = outletPins.length > 2 ? 240 : 200;

  const toggleOutletFilter = (outlet: string) => {
    setOutletFilter((current) => (current === outlet ? null : outlet));
  };

  const gpsHint = outletFilter
    ? `${outletFilter} · ${inRangeCount}/${filteredRows.length} in geofence`
    : `${outletPins.length} outlets · ${inRangeCount}/${rows.length} in geofence`;

  const gpsHintNode = (
    <span className="inline-flex items-center gap-1.5">
      <span className="iz-roster-gps-live-dot" aria-hidden />
      {gpsHint}
    </span>
  );

  if (rows.length === 0) {
    return (
      <OutletSection title="Live GPS" hint="No active PRs to track">
        <p className="iz-tiny iz-muted rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
          PR locations appear when someone is on duty today.
        </p>
      </OutletSection>
    );
  }

  return (
    <OutletSection title="Live GPS" hint={gpsHintNode} className="iz-roster-gps-section">
      <IzCard flat className="iz-roster-gps-card !p-0 overflow-hidden">
        {outletOptions.length > 1 && (
          <div className="iz-filter-chips border-b border-[var(--iz-line)] bg-[var(--iz-panel)] px-3 py-2">
            <button
              type="button"
              className={cn("iz-filter-chip", !outletFilter && "on")}
              onClick={() => setOutletFilter(null)}
            >
              All outlets
            </button>
            {outletOptions.map((outlet) => (
              <button
                key={outlet}
                type="button"
                className={cn("iz-filter-chip", outletFilter === outlet && "on")}
                onClick={() => toggleOutletFilter(outlet)}
              >
                {outlet}
              </button>
            ))}
          </div>
        )}
        <GpsRoadMap
          key={outletFilter ?? "all"}
          rows={filteredRows}
          bounds={bounds}
          outletPins={outletPins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          height={mapHeight}
        />

        <div className="iz-roster-gps-foot">
          {groupedByOutlet.map(([outlet, outletRows]) => {
            const pin = outletPins.find((p) => p.outlet === outlet) ?? {
              outlet,
              coord: OUTLET_GPS[outlet] ?? OUTLET_GPS["Velvet 23"],
            };
            return (
              <div key={outlet} className="iz-roster-gps-outlet">
                <div className="iz-roster-gps-outlet-head">
                  <button
                    type="button"
                    className={cn("iz-roster-gps-outlet-name", outletFilter === outlet && "on")}
                    onClick={() => toggleOutletFilter(outlet)}
                  >
                    {outlet}
                  </button>
                  <a
                    href={mapsUrlForCoord(pin.coord)}
                    target="_blank"
                    rel="noreferrer"
                    className="iz-roster-gps-maps-link"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Maps
                  </a>
                </div>
                <div className="iz-roster-gps-rows">
                  {outletRows.map((row) => {
                    const isSelected = row.slotId === selectedId;
                    return (
                      <button
                        key={row.slotId}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : row.slotId)}
                        className={cn("iz-roster-gps-row", isSelected && "on")}
                      >
                        <div className="iz-roster-gps-row-top">
                          <span className="iz-roster-gps-avatar">{row.prName.trim()[0]}</span>
                          <div className="min-w-0 flex-1">
                            <div className="iz-roster-gps-row-head">
                              <span className="iz-roster-gps-row-name">{row.prName}</span>
                              <IzPill variant="green" className="iz-roster-gps-row-pill">
                                On duty
                              </IzPill>
                            </div>
                            <span className="iz-roster-gps-row-meta">
                              {row.meters} m
                              {row.gpsFallback
                                ? " · Fallback"
                                : row.inRange
                                  ? " · In geofence"
                                  : " · Outside"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </IzCard>
    </OutletSection>
  );
}
