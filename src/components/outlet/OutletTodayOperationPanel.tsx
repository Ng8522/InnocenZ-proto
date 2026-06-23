import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PR, ShiftRequest } from "@/lib/store";
import type { AgencyRosterSlot } from "@/lib/agency-demo";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSection } from "@/components/outlet/OutletSection";
import { PR_RATING_TAGS } from "@/lib/outlet-demo";
import { outletCan } from "@/lib/outlet-rbac";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { outletMatches } from "@/lib/portal-sync";
import { rosterSlotAgencyName, languagesFromPr } from "@/lib/agency-demo";
import {
  comcardPreviewFromSlot,
  toComcardPreview,
} from "@/components/agency/PrComcardIdentity";
import {
  Comcard3dPreviewCard,
  Comcard3dPreviewThumb,
  Comcard3dPreviewVisual,
} from "@/components/agency/Comcard3dPreview";
import { IzSheet } from "@/components/iz/Sheet";
import { IzPill } from "@/components/iz/ui";
import {
  workforceStatusLabel,
  workforceStatusVariant,
} from "@/components/portal/LiveWorkforceTable";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FloorDisplayStatus = "on-duty" | "en-route" | "scheduled" | "out";

type StaffEntry = {
  pr: PR;
  slot?: AgencyRosterSlot;
  displayStatus: FloorDisplayStatus;
};

function resolveFloorPrDisplayStatus(slot?: AgencyRosterSlot): FloorDisplayStatus {
  if (!slot) return "scheduled";
  if (slot.checkedOutAt) return "out";
  if (slot.status === "on-duty" && slot.checkedInAt) return "on-duty";
  if (slot.status === "en-route") return "en-route";
  if (slot.status === "on-duty") return "en-route";
  return "scheduled";
}

const STATUS_SORT: Record<FloorDisplayStatus, number> = {
  "on-duty": 0,
  "en-route": 1,
  scheduled: 2,
  out: 3,
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
  const {
    prs,
    ratePr,
    agencyRoster,
    agencyPRs,
    postSealRatePrompt,
    clearPostSealRatePrompt,
  } = useStore();
  const canLogSales = outletCan(outletSubRole, "logSales");
  const canRate = outletCan(outletSubRole, "ratePrs");
  const [openPr, setOpenPr] = useState<string | null>(null);
  const [comcardPreviewId, setComcardPreviewId] = useState<string | null>(null);
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

  const rosterTonight = useMemo(
    () =>
      agencyRoster.filter(
        (s) => s.dateIso === DEFAULT_ROSTER_DATE_ISO && outletMatches(s.outlet, outletName),
      ),
    [agencyRoster, outletName],
  );

  const agencyPrById = useMemo(
    () => new Map(agencyPRs.map((p) => [p.id, p])),
    [agencyPRs],
  );

  const staffTonight = useMemo((): StaffEntry[] => {
    const rosterByPr = new Map(rosterTonight.map((s) => [s.prId, s]));
    return (shift.prs ?? [])
      .map((id) => {
        const pr = prs.find((p) => p.id === id);
        if (!pr) return null;
        const slot = rosterByPr.get(id);
        const displayStatus = resolveFloorPrDisplayStatus(slot);
        return { pr, slot, displayStatus };
      })
      .filter((entry): entry is StaffEntry => entry != null)
      .sort(
        (a, b) =>
          STATUS_SORT[a.displayStatus] - STATUS_SORT[b.displayStatus] ||
          a.pr.name.localeCompare(b.pr.name),
      );
  }, [shift.prs, prs, rosterTonight]);

  const statusCounts = useMemo(() => {
    const counts = { onDuty: 0, enRoute: 0, booked: 0, out: 0 };
    for (const { displayStatus } of staffTonight) {
      if (displayStatus === "on-duty") counts.onDuty += 1;
      else if (displayStatus === "en-route") counts.enRoute += 1;
      else if (displayStatus === "scheduled") counts.booked += 1;
      else counts.out += 1;
    }
    return counts;
  }, [staffTonight]);

  const openPrData = openPr ? prs.find((p) => p.id === openPr) : null;
  const comcardPreviewProfile = comcardPreviewId ? agencyPrById.get(comcardPreviewId) : null;
  const comcardPreviewPr = comcardPreviewProfile
    ? toComcardPreview(comcardPreviewProfile)
    : comcardPreviewId
      ? comcardPreviewFromSlot(
          { prId: comcardPreviewId, prName: prs.find((p) => p.id === comcardPreviewId)?.name ?? "PR" },
          null,
        )
      : null;

  const toggleTag = (tag: string) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  const staffHint =
    staffTonight.length === 0
      ? "No PRs yet"
      : [
          statusCounts.onDuty > 0 ? `${statusCounts.onDuty} on duty` : null,
          statusCounts.enRoute > 0 ? `${statusCounts.enRoute} en route` : null,
          statusCounts.booked > 0 ? `${statusCounts.booked} booked` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  if (!canRate && !canLogSales) return null;

  return (
    <div className={cn("rounded-2xl border border-[var(--iz-line)] bg-[var(--iz-grad-card)] p-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="iz-tiny iz-muted2 uppercase tracking-widest">Today operation</p>
          <p className="font-sora mt-0.5 text-sm font-bold text-[var(--iz-txt)] truncate">
            {shift.event}
          </p>
          <p className="iz-tiny iz-muted mt-0.5">{shift.shift}</p>
        </div>
      </div>

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

      {canRate && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IzPill variant="green">{staffTonight.length} PRs</IzPill>
          {statusCounts.onDuty > 0 && (
            <IzPill variant="green" className="!py-0.5 !text-[9px]">
              {statusCounts.onDuty} on duty
            </IzPill>
          )}
          {statusCounts.enRoute > 0 && (
            <IzPill variant="violet" className="!py-0.5 !text-[9px]">
              {statusCounts.enRoute} en route
            </IzPill>
          )}
          {statusCounts.booked > 0 && (
            <IzPill variant="amber" className="!py-0.5 !text-[9px]">
              {statusCounts.booked} booked
            </IzPill>
          )}
        </div>
      )}

      {canLogSales && shift.status === "confirmed" && (
        <div className="mt-3">
          <OutletShiftSalesPanel shiftId={shift.id} label="Log sales" collapsible />
        </div>
      )}

      {canRate && (
        <OutletSection title="Staff tonight" hint={staffHint} className="!mt-3 !mb-0">
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
                  slot?.checkedInAt ? `In ${slot.checkedInAt}` : null,
                  (slot?.floorDrinks ?? 0) > 0 ? `${slot.floorDrinks} drinks` : null,
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
        </OutletSection>
      )}

      <IzSheet open={!!comcardPreviewPr} onClose={() => setComcardPreviewId(null)}>
        {comcardPreviewPr && (
          <div className="px-1 pb-2">
            <div className="iz-cardttl mb-1">{comcardPreviewPr.name}</div>
            {(() => {
              const slot = rosterTonight.find((s) => s.prId === comcardPreviewId);
              return slot ? (
                <p className="iz-tiny iz-muted mb-3">{rosterSlotAgencyName(slot)}</p>
              ) : null;
            })()}
            <Comcard3dPreviewVisual pr={comcardPreviewPr} showName={false} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {comcardPreviewProfile?.trainingLevel && (
                <IzPill variant="ink" className="!py-0.5 !text-[9px]">
                  {comcardPreviewProfile.trainingLevel}
                </IzPill>
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
    </div>
  );
}
