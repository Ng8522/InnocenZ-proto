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
  prSubRole?: "pr_tied" | "pr_free" | null;
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
  const mapHeight = outletPins.length > 2 ? 280 : 228;

  const toggleOutletFilter = (outlet: string) => {
    setOutletFilter((current) => (current === outlet ? null : outlet));
  };

  const gpsHint = outletFilter
    ? `${outletFilter} · ${inRangeCount}/${filteredRows.length} in geofence`
    : `${outletPins.length} outlets · ${inRangeCount}/${rows.length} in geofence`;

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
    <OutletSection title="Live GPS" hint={gpsHint}>
      <IzCard flat className="!p-0 overflow-hidden">
        {outletOptions.length > 1 && (
          <div className="iz-filter-chips border-b border-[var(--iz-line)] bg-[var(--iz-panel)] px-3 py-2.5">
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

        <div className="border-t border-[var(--iz-line)] bg-[var(--iz-panel)] px-3 py-2.5">
          <div className="space-y-4">
            {groupedByOutlet.map(([outlet, outletRows]) => {
              const pin = outletPins.find((p) => p.outlet === outlet) ?? {
                outlet,
                coord: OUTLET_GPS[outlet] ?? OUTLET_GPS["Velvet 23"],
              };
              return (
                <div key={outlet}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className={cn(
                        "font-sora text-sm font-bold transition-colors",
                        outletFilter === outlet
                          ? "text-[var(--iz-gold-l)]"
                          : "text-[var(--iz-txt)] hover:text-[var(--iz-gold-l)]",
                      )}
                      onClick={() => toggleOutletFilter(outlet)}
                    >
                      {outlet}
                    </button>
                    <a
                      href={mapsUrlForCoord(pin.coord)}
                      target="_blank"
                      rel="noreferrer"
                      className="iz-tiny inline-flex shrink-0 items-center gap-1 text-[#1a73e8]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Maps
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {outletRows.map((row) => {
                      const isSelected = row.slotId === selectedId;
                      return (
                        <button
                          key={row.slotId}
                          type="button"
                          onClick={() => setSelectedId(isSelected ? null : row.slotId)}
                          className={cn(
                            "flex min-w-0 flex-col gap-1 rounded-xl border px-2 py-2 text-left transition-colors",
                            isSelected
                              ? "border-[#1a73e8] bg-[rgba(26,115,232,.08)]"
                              : "border-[var(--iz-line)] bg-white/[0.02] hover:bg-white/[0.04]",
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-1.5">
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                row.inRange
                                  ? "bg-[#34A853] text-white"
                                  : "bg-[#4285F4] text-white",
                              )}
                            >
                              {row.prName.trim()[0]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-center gap-1">
                                <span className="truncate font-sora text-[11px] font-bold leading-tight">
                                  {row.prName}
                                </span>
                                <IzPill variant="green" className="!px-1.5 !py-0.5 !text-[11px] !font-bold">
                                  On duty
                                </IzPill>
                              </div>
                              <p className="iz-tiny iz-muted truncate leading-tight">
                                {row.meters} m
                                {row.gpsFallback
                                  ? " · Fallback"
                                  : row.inRange
                                    ? " · In geofence"
                                    : " · Outside"}
                              </p>
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
        </div>
      </IzCard>
    </OutletSection>
  );
}
