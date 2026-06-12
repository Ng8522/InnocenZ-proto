import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { IzCard, IzPill } from "@/components/iz/ui";
import { GpsRoadMap } from "@/components/agency/GpsRoadMap";
import type { AgencyManagedPR, AgencyRosterSlot } from "@/lib/agency-demo";
import {
  buildGpsTrackingRows,
  gpsMapBounds,
  mapsDirectionsUrl,
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

  const rows = useMemo(
    () => buildGpsTrackingRows(roster, agencyPRs, dateIso, prCheckInMeta, activePrId),
    [roster, agencyPRs, dateIso, prCheckInMeta, activePrId],
  );

  const bounds = useMemo(() => gpsMapBounds(rows), [rows]);
  const outletPins = useMemo(() => uniqueOutletPins(rows), [rows]);
  const inRangeCount = rows.filter((r) => r.inRange).length;
  const groupedByOutlet = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = map.get(row.outlet) ?? [];
      list.push(row);
      map.set(row.outlet, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  const mapHeight = outletPins.length > 2 ? 280 : 228;

  if (rows.length === 0) {
    return (
      <OutletSection title="Live GPS" hint="No active PRs to track">
        <p className="iz-tiny iz-muted rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
          PR locations appear when someone is on duty or en route today.
        </p>
      </OutletSection>
    );
  }

  return (
    <OutletSection
      title="Live GPS"
      hint={`${outletPins.length} outlets · ${inRangeCount}/${rows.length} in geofence`}
    >
      <IzCard flat className="!p-0 overflow-hidden">
        <GpsRoadMap
          rows={rows}
          bounds={bounds}
          outletPins={outletPins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          height={mapHeight}
        />

        <div className="border-t border-[var(--iz-line)] bg-[var(--iz-panel)] px-3 py-2.5">
          <div className="space-y-3">
            {groupedByOutlet.map(([outlet, outletRows]) => (
              <div key={outlet}>
                {groupedByOutlet.length > 1 && (
                  <p className="iz-tiny iz-muted mb-1.5 px-1 font-semibold uppercase tracking-wide">
                    {outlet} · {outletRows.length} PR{outletRows.length === 1 ? "" : "s"}
                  </p>
                )}
                <div className="space-y-2">
                  {outletRows.map((row) => {
                    const isSelected = row.slotId === selectedId;
                    const enRoute = row.status === "en-route";
                    return (
                      <button
                        key={row.slotId}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : row.slotId)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "border-[#1a73e8] bg-[rgba(26,115,232,.08)]"
                            : "border-[var(--iz-line)] bg-white/[0.02] hover:bg-white/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            enRoute
                              ? "bg-[#FBBC04] text-[#202124]"
                              : row.inRange
                                ? "bg-[#34A853] text-white"
                                : "bg-[#4285F4] text-white",
                          )}
                        >
                          {row.prName.trim()[0]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-sora text-sm font-bold">{row.prName}</span>
                            <IzPill variant={enRoute ? "amber" : "green"} className="!py-0.5 !text-[9px]">
                              {enRoute ? "En route" : "On duty"}
                            </IzPill>
                          </div>
                          <p className="iz-tiny iz-muted truncate">
                            {row.meters} m
                            {row.gpsFallback
                              ? " · Maps fallback"
                              : enRoute
                                ? " · Heading to venue"
                                : row.inRange
                                  ? " · In geofence"
                                  : " · Outside geofence"}
                          </p>
                        </div>
                        <a
                          href={mapsDirectionsUrl(row.prCoord, row.outletCoord)}
                          target="_blank"
                          rel="noreferrer"
                          className="iz-chip shrink-0 !border-[#dadce0] !bg-white !px-2.5 !py-1 !text-[10px] !text-[#1a73e8]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" /> Directions
                        </a>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {outletPins.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {outletPins.map((pin) => (
                <a
                  key={pin.outlet}
                  href={mapsUrlForCoord(pin.coord)}
                  target="_blank"
                  rel="noreferrer"
                  className="iz-tiny inline-flex items-center gap-1 text-[#1a73e8]"
                >
                  <ExternalLink className="h-3 w-3" />
                  {pin.outlet}
                </a>
              ))}
            </div>
          )}
        </div>
      </IzCard>
    </OutletSection>
  );
}
