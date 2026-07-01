import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PR, ShiftRequest } from "@/lib/store";
import type { AgencyRosterSlot } from "@/lib/agency-demo";
import { OutletSection } from "@/components/outlet/OutletSection";
import {
  outletTonightFloorTotals,
  outletTonightLiveEarningsRows,
  outletShiftFloorSalesStarted,
} from "@/lib/outlet-financial-sync";
import { specialServicesForOutlet } from "@/lib/special-service-actions";
import {
  resolveShiftTierRates,
  PR_RATING_TAGS,
  OUTLET_PR_TONIGHT_SECTION_ID,
  OUTLET_LIVE_SALES_SECTION_ID,
  OUTLET_OPEN_LIVE_SALES_EVENT,
} from "@/lib/outlet-demo";
import { outletCan } from "@/lib/outlet-rbac";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { outletMatches } from "@/lib/portal-sync";
import { rosterSlotAgencyName, languagesFromPr } from "@/lib/agency-demo";
import { TIED_DEMO_ROSTER_PR_ID } from "@/lib/pr-demo";
import type { PrShiftSessionState } from "@/lib/pr-session";
import { comcardPreviewFromSlot, toComcardPreview } from "@/components/agency/PrComcardIdentity";
import {
  Comcard3dPreviewCard,
  Comcard3dPreviewThumb,
  Comcard3dPreviewVisual,
} from "@/components/agency/Comcard3dPreview";
import { OutletPrShiftHistorySheet } from "@/components/iz/ShiftHistoryLog";
import { IzSheet } from "@/components/iz/Sheet";
import { IzPill, TierBadge } from "@/components/iz/ui";
import {
  workforceStatusLabel,
  workforceStatusVariant,
} from "@/components/portal/LiveWorkforceTable";
import { OutletFormCard } from "@/components/outlet/outlet-portal-ui";
import { OutletTonightSummaryTable } from "@/components/outlet/OutletTonightSummaryTable";
import { OutletPrLiveSalesSheet } from "@/components/outlet/OutletPrLiveSalesSheet";
import { OutletPrLiveSalesFloorTable } from "@/components/outlet/OutletPrLiveSalesFloorTable";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";


type FloorDisplayStatus = "on-duty" | "en-route" | "scheduled" | "checked-out";

type StaffEntry = {
  pr: PR;
  slot?: AgencyRosterSlot;
  displayStatus: FloorDisplayStatus;
};

function resolveFloorPrDisplayStatusFromSlot(slot?: AgencyRosterSlot): FloorDisplayStatus {
  if (!slot) return "scheduled";
  if (slot.status === "on-duty" && slot.checkedInAt) return "on-duty";
  if (slot.checkedOutAt) return "checked-out";
  if (slot.status === "en-route") return "en-route";
  if (slot.status === "on-duty") return "en-route";
  return "scheduled";
}

function resolveTiedPrLiveAttendance(
  prSessionByRole: Partial<Record<string, PrShiftSessionState>> | undefined,
  prSubRole: string | null,
  checkedIn: boolean,
  checkedOut: boolean,
  prActiveShift: { outlet: string } | null | undefined,
) {
  const cache = prSessionByRole?.pr_tied;
  const onTiedRole = prSubRole === "pr_tied";
  const liveCheckedIn = onTiedRole ? checkedIn : (cache?.checkedIn ?? checkedIn);
  const liveCheckedOut = onTiedRole ? checkedOut : (cache?.checkedOut ?? checkedOut);
  const liveSession =
    (onTiedRole ? prActiveShift : cache?.prActiveShift) ?? prActiveShift ?? null;
  return {
    onDuty: Boolean(liveCheckedIn && !liveCheckedOut && liveSession),
    checkedOutTonight: Boolean(liveCheckedOut),
    outlet: liveSession?.outlet,
  };
}

function resolveStaffFloorStatus(
  prId: string,
  slot: AgencyRosterSlot | undefined,
  tiedLive: ReturnType<typeof resolveTiedPrLiveAttendance>,
): FloorDisplayStatus {
  if (prId === TIED_DEMO_ROSTER_PR_ID) {
    if (tiedLive.onDuty) return "on-duty";
    if (tiedLive.checkedOutTonight) return "checked-out";
  }
  return resolveFloorPrDisplayStatusFromSlot(slot);
}

const STATUS_SORT: Record<FloorDisplayStatus, number> = {
  "on-duty": 0,
  "en-route": 1,
  scheduled: 2,
  "checked-out": 3,
};

export function OutletTodayOperationPanel({
  shift,
  outletName,
  className,
}: {
  shift: ShiftRequest;
  outletName: string;
  className?: string;
}) {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const specialServiceOrders = useStore((s) => s.specialServiceOrders);
  const { prs, ratePr, agencyRoster, agencyPRs, postSealRatePrompt, clearPostSealRatePrompt } =
    useStore();
  const prSubRole = useStore((s) => s.prSubRole);
  const prSessionByRole = useStore((s) => s.prSessionByRole);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const syncLivePrCheckInToRoster = useStore((s) => s.syncLivePrCheckInToRoster);
  const canRate = outletCan(outletSubRole, "ratePrs");
  const [openPr, setOpenPr] = useState<string | null>(null);
  const [comcardPreviewId, setComcardPreviewId] = useState<string | null>(null);
  const [historyPrId, setHistoryPrId] = useState<string | null>(null);
  const [liveSalesPrId, setLiveSalesPrId] = useState<string | null>(null);
  const [liveSalesOpen, setLiveSalesOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (postSealRatePrompt?.prIds[0]) {
      setOpenPr(postSealRatePrompt.prIds[0]);
      setStars(5);
      setNote("");
      setTags([]);
    }
  }, [postSealRatePrompt]);

  useEffect(() => {
    const openLiveSales = () => setLiveSalesOpen(true);
    window.addEventListener(OUTLET_OPEN_LIVE_SALES_EVENT, openLiveSales);
    return () => window.removeEventListener(OUTLET_OPEN_LIVE_SALES_EVENT, openLiveSales);
  }, []);

  useEffect(() => {
    syncLivePrCheckInToRoster();
  }, [
    syncLivePrCheckInToRoster,
    checkedIn,
    checkedOut,
    prActiveShift,
    prSubRole,
    prSessionByRole,
    agencyRoster.length,
  ]);

  const tiedLive = useMemo(
    () =>
      resolveTiedPrLiveAttendance(
        prSessionByRole,
        prSubRole,
        checkedIn,
        checkedOut,
        prActiveShift,
      ),
    [prSessionByRole, prSubRole, checkedIn, checkedOut, prActiveShift],
  );

  const rosterTonight = useMemo(
    () =>
      agencyRoster.filter(
        (s) => s.dateIso === DEFAULT_ROSTER_DATE_ISO && outletMatches(s.outlet, outletName),
      ),
    [agencyRoster, outletName],
  );

  const agencyPrById = useMemo(() => new Map(agencyPRs.map((p) => [p.id, p])), [agencyPRs]);

  const staffTonight = useMemo((): StaffEntry[] => {
    const rosterByPr = new Map(rosterTonight.map((s) => [s.prId, s]));
    return (shift.prs ?? [])
      .flatMap((id): StaffEntry[] => {
        const pr = prs.find((p) => p.id === id);
        if (!pr) return [];
        const slot = rosterByPr.get(id);
        const displayStatus = resolveStaffFloorStatus(id, slot, tiedLive);
        return slot ? [{ pr, slot, displayStatus }] : [{ pr, displayStatus }];
      })
      .sort(
        (a, b) =>
          STATUS_SORT[a.displayStatus] - STATUS_SORT[b.displayStatus] ||
          a.pr.name.localeCompare(b.pr.name),
      );
  }, [shift.prs, prs, rosterTonight, tiedLive]);

  const statusCounts = useMemo(() => {
    const counts = { onDuty: 0, enRoute: 0, booked: 0, checkedOut: 0 };
    for (const { displayStatus } of staffTonight) {
      if (displayStatus === "on-duty") counts.onDuty += 1;
      else if (displayStatus === "en-route") counts.enRoute += 1;
      else if (displayStatus === "scheduled") counts.booked += 1;
      else if (displayStatus === "checked-out") counts.checkedOut += 1;
    }
    return counts;
  }, [staffTonight]);

  const openPrData = openPr ? prs.find((p) => p.id === openPr) : null;
  const comcardPreviewProfile = comcardPreviewId ? agencyPrById.get(comcardPreviewId) : null;
  const comcardPreviewPr = comcardPreviewProfile
    ? toComcardPreview(comcardPreviewProfile)
    : comcardPreviewId
      ? comcardPreviewFromSlot(
          {
            prId: comcardPreviewId,
            prName: prs.find((p) => p.id === comcardPreviewId)?.name ?? "PR",
          },
          null,
        )
      : null;
  const historyPr = historyPrId ? prs.find((p) => p.id === historyPrId) : null;
  const historyPrSlot = historyPrId
    ? rosterTonight.find((s) => s.prId === historyPrId)
    : undefined;
  const historyPrAgency = historyPrSlot ? rosterSlotAgencyName(historyPrSlot) : undefined;
  const tierRates = useMemo(
    () => resolveShiftTierRates(shift, outletWorkspace),
    [shift, outletWorkspace],
  );

  const liveEarningsRows = useMemo(
    () =>
      outletTonightLiveEarningsRows({
        shift,
        outletName,
        drinkMenu: outletWorkspace.drinkMenu ?? [],
        rosterSlots: rosterTonight,
        prIds: shift.prs ?? [],
        prNameById: Object.fromEntries(prs.map((p) => [p.id, p.name])),
        trainingLevelById: Object.fromEntries(agencyPRs.map((p) => [p.id, p.trainingLevel])),
        tierRates,
        happyHourStart: outletWorkspace.happyHourStart,
        happyHourEnd: outletWorkspace.happyHourEnd,
        receiptScans: prReceiptScans,
      }),
    [
      shift,
      outletName,
      outletWorkspace.drinkMenu,
      outletWorkspace.happyHourStart,
      outletWorkspace.happyHourEnd,
      rosterTonight,
      prs,
      agencyPRs,
      tierRates,
      prReceiptScans,
    ],
  );

  const liveSalesBreakdown = liveSalesPrId
    ? (liveEarningsRows.find((row) => row.prId === liveSalesPrId) ?? null)
    : null;

  const floorSalesStarted = outletShiftFloorSalesStarted(shift);

  const tonightFloorTotals = useMemo(
    () => {
      if (!floorSalesStarted) {
        return { totalSalesRm: 0, totalDrinksRm: 0, drinkUnits: 0, totalTipsRm: 0 };
      }
      return outletTonightFloorTotals({
        shift,
        outletName,
        drinkMenu: outletWorkspace.drinkMenu ?? [],
        rosterSlots: rosterTonight,
        prIds: shift.prs ?? [],
        receiptScans: prReceiptScans,
      });
    },
    [floorSalesStarted, shift, outletName, outletWorkspace.drinkMenu, rosterTonight, prReceiptScans],
  );

  const tonightSpecialServiceRm = useMemo(
    () => {
      if (!floorSalesStarted) return 0;
      return specialServicesForOutlet(specialServiceOrders, outletName)
        .filter(
          (r) =>
            r.dateIso === DEFAULT_ROSTER_DATE_ISO &&
            r.status !== "declined" &&
            r.status !== "rejected",
        )
        .reduce((sum, r) => sum + r.amountIn, 0);
    },
    [floorSalesStarted, specialServiceOrders, outletName],
  );

  const toggleTag = (tag: string) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  const staffHint =
    staffTonight.length === 0
      ? "No PRs yet"
      : [
          statusCounts.onDuty > 0 ? `${statusCounts.onDuty} on duty` : null,
          statusCounts.enRoute > 0 ? `${statusCounts.enRoute} en route` : null,
          statusCounts.checkedOut > 0 ? `${statusCounts.checkedOut} checked out` : null,
          statusCounts.booked > 0 ? `${statusCounts.booked} booked` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  if (!canRate) return null;

  return (
    <OutletFormCard className={cn("!mb-0", className)}>
      {postSealRatePrompt && canRate && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[rgba(232,194,122,.3)] bg-[rgba(232,194,122,.06)] px-3 py-2">
          <p className="text-xs font-semibold">
            Rate {postSealRatePrompt.prIds.length} PR
            {postSealRatePrompt.prIds.length !== 1 ? "s" : ""} · 24h
          </p>
          <button
            type="button"
            className="iz-chip text-[10px]"
            onClick={() => clearPostSealRatePrompt()}
          >
            Dismiss
          </button>
        </div>
      )}

      <OutletSection id={OUTLET_PR_TONIGHT_SECTION_ID} title="PR tonight" hint={staffHint} className="!mb-0">
          {staffTonight.length === 0 ? (
            <p className="iz-tiny iz-muted rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
              No PRs assigned for tonight yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {staffTonight.map(({ pr, slot, displayStatus }) => {
                const agencyProfile = agencyPrById.get(pr.id);
                const comcardPr = agencyProfile
                  ? toComcardPreview(agencyProfile)
                  : comcardPreviewFromSlot({ prId: pr.id, prName: pr.name });
                const langs = agencyProfile ? languagesFromPr(agencyProfile) : pr.languages;
                const opsLine = [
                  displayStatus === "on-duty" && slot?.checkedInAt
                    ? `In ${slot.checkedInAt}`
                    : displayStatus === "checked-out" && slot?.checkedOutAt
                      ? `Out ${slot.checkedOutAt}`
                      : null,
                  (slot?.floorDrinks ?? 0) > 0 ? `${slot?.floorDrinks} drinks` : null,
                  slot ? rosterSlotAgencyName(slot) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={pr.id}
                    className="flex flex-col gap-1 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-grad-card)] p-2"
                  >
                    <button
                      type="button"
                      className="iz-comcard-3d-preview-btn relative w-full text-left"
                      aria-label={`View comcard for ${pr.name}`}
                      onClick={() => setComcardPreviewId(pr.id)}
                    >
                      <IzPill
                        variant={workforceStatusVariant(displayStatus)}
                        className="absolute right-1 top-1 z-10 !py-0 !text-[8px] shadow-sm"
                      >
                        {workforceStatusLabel(displayStatus)}
                      </IzPill>
                      <Comcard3dPreviewCard
                        pr={comcardPr}
                        trainingLevel={agencyProfile?.trainingLevel}
                        rating={agencyProfile?.rating ?? pr.rating}
                        languages={langs}
                        place={agencyProfile?.place}
                      />
                    </button>

                    {opsLine && (
                      <p className="text-[10px] leading-tight text-[var(--iz-muted2)] line-clamp-2">
                        {opsLine}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setLiveSalesPrId(pr.id)}
                      className="iz-btn iz-btn-soft iz-btn-sm w-full !py-1.5 !text-[10px]"
                    >
                      Live sales
                    </button>

                    <button
                      type="button"
                      onClick={() => setHistoryPrId(pr.id)}
                      className="iz-btn iz-btn-soft iz-btn-sm w-full !py-1.5 !text-[10px]"
                    >
                      Shift history
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenPr(pr.id)}
                      className="iz-btn iz-btn-soft iz-btn-sm w-full !py-1.5 !text-[10px]"
                    >
                      Rate
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <OutletSection
            id={OUTLET_LIVE_SALES_SECTION_ID}
            title="Live sales"
            collapsible
            open={liveSalesOpen}
            onOpenChange={setLiveSalesOpen}
            className="iz-outlet-live-sales-section !mt-3"
            collapsedPreview={
              <OutletTonightSummaryTable
                floorTotals={tonightFloorTotals}
                specialServiceRm={tonightSpecialServiceRm}
                outletSubRole={outletSubRole}
                drinkMenu={outletWorkspace.drinkMenu ?? []}
                shift={shift}
                variant="collapsed"
              />
            }
          >
            <OutletTonightSummaryTable
              floorTotals={tonightFloorTotals}
              specialServiceRm={tonightSpecialServiceRm}
              outletSubRole={outletSubRole}
              drinkMenu={outletWorkspace.drinkMenu ?? []}
              shift={shift}
              variant="embedded"
            />
            <OutletPrLiveSalesFloorTable
              rows={liveEarningsRows}
              onRowClick={(prId) => setLiveSalesPrId(prId)}
            />
          </OutletSection>
      </OutletSection>

      <IzSheet open={!!comcardPreviewPr} onClose={() => setComcardPreviewId(null)} comcard>
        {comcardPreviewPr && (
          <div className="iz-outlet-comcard-sheet">
            <p className="iz-outlet-comcard-sheet__meta">
              <span className="font-sora font-bold text-[var(--iz-txt)]">{comcardPreviewPr.name}</span>
              {(() => {
                const slot = rosterTonight.find((s) => s.prId === comcardPreviewId);
                return slot ? (
                  <span className="iz-muted"> · {rosterSlotAgencyName(slot)}</span>
                ) : null;
              })()}
            </p>
            <Comcard3dPreviewVisual pr={comcardPreviewPr} showName={false} compact />
            <div className="iz-outlet-comcard-sheet__pills">
              {comcardPreviewProfile?.trainingLevel && (
                <TierBadge tier={comcardPreviewProfile.trainingLevel} />
              )}
              {comcardPreviewProfile?.rating != null && (
                <IzPill variant="gold" className="!py-0.5 !text-[9px]">
                  {comcardPreviewProfile.rating}★
                </IzPill>
              )}
              {(comcardPreviewProfile ? languagesFromPr(comcardPreviewProfile) : [])
                .slice(0, 3)
                .map((lang) => (
                  <IzPill key={lang} variant="violet" className="!py-0.5 !text-[9px]">
                    {lang}
                  </IzPill>
                ))}
            </div>
          </div>
        )}
      </IzSheet>

      {historyPr && (
        <OutletPrShiftHistorySheet
          open
          onClose={() => setHistoryPrId(null)}
          prId={historyPr.id}
          prName={historyPr.name}
          outletName={outletName}
          agencyName={historyPrAgency || undefined}
        />
      )}

      {liveSalesBreakdown && (
        <OutletPrLiveSalesSheet
          open
          onClose={() => setLiveSalesPrId(null)}
          shiftEvent={shift.event}
          breakdown={liveSalesBreakdown}
        />
      )}

      {openPr && openPrData && canRate && (
        <IzSheet open onClose={() => setOpenPr(null)} rating>
          <div className="iz-outlet-rate-sheet">
            <div className="mb-4 flex items-center gap-3">
              <Comcard3dPreviewThumb
                pr={
                  agencyPrById.get(openPrData.id)
                    ? toComcardPreview(agencyPrById.get(openPrData.id)!)
                    : comcardPreviewFromSlot({ prId: openPrData.id, prName: openPrData.name })
                }
              />
              <h3 className="font-sora text-lg font-bold">Rate {openPrData.name}</h3>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)}>
                  <Star
                    className={`h-8 w-8 ${n <= stars ? "fill-[var(--iz-gold)] text-[var(--iz-gold)]" : "text-[var(--iz-muted2)]"}`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {PR_RATING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`iz-pill !text-[10px] ${tags.includes(tag) ? "iz-pill-violet" : "iz-pill-ink"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="mt-4 h-24 w-full rounded-xl border border-[var(--iz-line2)] bg-white/[0.03] p-3.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                ratePr(openPr, stars, note, tags.length > 0 ? tags : undefined);
                setOpenPr(null);
              }}
              className="iz-btn iz-btn-primary mt-4 w-full"
            >
              Submit
            </button>
          </div>
        </IzSheet>
      )}
    </OutletFormCard>
  );
}
