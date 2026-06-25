import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { outletHomeShiftRequests } from "@/lib/agency-outlet-shifts";
import { PR_AGENCY_TIED_OFFERS } from "@/lib/pr-features";
import { outletCan } from "@/lib/outlet-rbac";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSealReview } from "@/components/outlet/OutletSealReview";
import { OutletTodayOperationPanel } from "@/components/outlet/OutletTodayOperationPanel";
import {
  SHIFT_DESTINATION_LABELS,
  formatOutletShiftDualMetric,
  formatOutletShiftMetricAmount,
  formatShiftDrinkPricingSummary,
  formatShiftEventTypeSummary,
  outletShiftActualLaborCost,
  outletShiftCutLoss,
  outletShiftCutLossAdjustmentsLabel,
  outletShiftDemandSupplied,
  outletShiftTargetLaborCost,
  outletShiftTargetSalesForShift,
  resolveShiftTierRates,
  shiftDrinkMenuDetailLines,
} from "@/lib/outlet-demo";
import { outletShiftDisplayLiveSales } from "@/lib/outlet-financial-sync";
import { OutletCutLossActions } from "@/components/outlet/OutletCutLossActions";
import { formatTierSalesTargets, formatTierWageRange } from "@/lib/agency-demo";
import { ShiftTierWagesStrip } from "@/components/outlet/ShiftTierWagesStrip";
import { Check, CheckCircle2, ChevronDown, Clock, Lock, PlayCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META = {
  sealed: { tone: "iz-pill-ink", icon: Lock, label: "Sealed" },
  confirmed: { tone: "iz-pill-green", icon: CheckCircle2, label: "Live" },
  open: { tone: "iz-pill-amber", icon: PlayCircle, label: "Open" },
  draft: { tone: "iz-pill-violet", icon: Clock, label: "Draft" },
} as const;

export function OutletBookings({ variant = "home" }: { variant?: "home" | "future" }) {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const {
    shifts,
    sealShift,
    confirmShift,
    deleteShift,
    shiftApplicants,
    respondToApplicant,
  } = useStore();
  const canLogSales = outletCan(outletSubRole, "logSales");
  const canConfirm = outletCan(outletSubRole, "confirmShift");
  const canSeal = outletCan(outletSubRole, "sealShift");
  const canDelete = outletCan(outletSubRole, "postJob");
  const canStaff = outletCan(outletSubRole, "manageShiftStaffing");

  const visibleShifts = useMemo(
    () =>
      outletHomeShiftRequests({
        shifts,
        outletName: outletWorkspace.outletName,
        roster: agencyRoster,
        tiedOffers: PR_AGENCY_TIED_OFFERS,
        commissionRules: outletCommissionRules,
        outletWorkspace,
      }),
    [shifts, outletWorkspace, agencyRoster, outletCommissionRules],
  );

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sealTargetId, setSealTargetId] = useState<string | null>(null);

  const liveShift =
    visibleShifts.find((s) => s.status === "confirmed" && s.date === "Tonight") ??
    visibleShifts.find((s) => s.status === "confirmed");
  const futureShifts = liveShift
    ? visibleShifts.filter((s) => s.id !== liveShift.id)
    : visibleShifts;

  const defaultOpenId = variant === "home" ? liveShift?.id : futureShifts[0]?.id;
  const deleteTarget = deleteTargetId ? visibleShifts.find((s) => s.id === deleteTargetId) : null;
  const sealTarget = sealTargetId ? visibleShifts.find((s) => s.id === sealTargetId) : null;

  if (variant === "home" && !liveShift) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No live shift tonight — check Future Operations for upcoming events.
      </p>
    );
  }

  if (variant === "future" && futureShifts.length === 0) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No upcoming shifts — use Post Job to create one.
      </p>
    );
  }

  if (visibleShifts.length === 0) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No shifts yet — use Post Job to create one.
      </p>
    );
  }

  const renderShiftCard = (s: (typeof visibleShifts)[number], hideLogSales = false) => {
    const meta = STATUS_META[s.status] ?? STATUS_META.draft;
    const StatusIcon = meta.icon;
    const showApplicantActions = variant !== "future";
    const applicants = shiftApplicants.filter((a) => a.shiftId === s.id && a.status === "pending");
    const outletRequests = applicants.filter((a) => a.source === "outlet_request");
    const freelancerApplicants = applicants.filter((a) => a.source !== "outlet_request");
    const visibleApplicants = showApplicantActions ? freelancerApplicants : outletRequests;
    const drinkLines = shiftDrinkMenuDetailLines(s, outletWorkspace.drinkMenu ?? []);
    const eventTypeLabel = formatShiftEventTypeSummary(s.eventKind ?? "normal", s.specialEventType);
    const drinkPricingLabel = formatShiftDrinkPricingSummary(s, outletWorkspace.drinkMenu ?? []);
    const tierRates = resolveShiftTierRates(s, outletWorkspace);
    const targetPay = formatTierWageRange(tierRates);
    const salesTargets = formatTierSalesTargets(tierRates);
    const prTierById = Object.fromEntries(agencyPRs.map((pr) => [pr.id, pr.trainingLevel]));
    const targetSales = outletShiftTargetSalesForShift(s, tierRates);
    const targetCost = outletShiftTargetLaborCost(s, tierRates, prTierById);
    const actualCost = outletShiftActualLaborCost(s, tierRates, prTierById);
    const displaySales = outletShiftDisplayLiveSales(s);
    const cutLoss = outletShiftCutLoss(targetCost, actualCost);
    const { demand: staffingDemand, supplied } = outletShiftDemandSupplied(s);
    const adjustmentsLabel = outletShiftCutLossAdjustmentsLabel(s);

    return (
      <details key={s.id} className="iz-outlet-booking-card group" open={s.id === defaultOpenId}>
        <summary className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{s.event}</span>
              {s.eventKind === "special" && (
                <IzPill variant="gold" className="shrink-0 !py-0.5 !text-[9px]">
                  {formatShiftEventTypeSummary(s.eventKind, s.specialEventType)}
                </IzPill>
              )}
              <span className={cn("iz-pill shrink-0 !py-0.5 !text-[9px]", meta.tone)}>
                <StatusIcon className="mr-0.5 inline h-2.5 w-2.5" />
                {meta.label}
              </span>
            </div>
            <p className="iz-tiny iz-muted mt-0.5 truncate group-open:hidden">
              {s.date} · {supplied}/{s.quantity} PRs · {targetPay}
              {salesTargets ? ` · ${salesTargets}` : ""} · RM {displaySales.toLocaleString()} sales
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iz-muted)] transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-[var(--iz-line)] px-3.5 pb-3.5 pt-2">
          <p className="iz-tiny iz-muted2">{s.shift}</p>
          <div className="mt-1 space-y-0.5">
            <p className="iz-tiny iz-muted2">
              <span className="text-[var(--iz-muted)]">Event type · </span>
              {eventTypeLabel}
            </p>
            <p className="iz-tiny iz-muted2">
              <span className="text-[var(--iz-muted)]">Drink prices · </span>
              {drinkPricingLabel}
            </p>
            {s.eventKind === "special" && drinkLines.length > 0 && (
              <p className="iz-tiny iz-muted2 leading-relaxed">
                {drinkLines.map((d, i) => (
                  <span key={d.name}>
                    {i > 0 ? " · " : null}
                    <span className={d.changed ? "text-[var(--iz-gold)]" : undefined}>
                      {d.name} RM {d.priceRm}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>
          {(s.dressCode || s.destination) && (
            <p className="iz-tiny iz-muted2 mt-0.5">
              {[s.dressCode, s.destination && SHIFT_DESTINATION_LABELS[s.destination]]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px]">
            <Metric label="Demand/Supplied" value={`${staffingDemand}/${supplied}`} />
            <Metric
              label="Target Cost/ Actual Cost"
              value={formatOutletShiftDualMetric(targetCost, actualCost)}
              gold
            />
            <Metric
              label="Target Sales/ Actual Sales"
              value={formatOutletShiftDualMetric(targetSales, displaySales)}
              green
            />
            <Metric
              label="Cutlost"
              value={formatOutletShiftMetricAmount(cutLoss)}
              red={cutLoss > 0}
            />
          </div>
          {adjustmentsLabel && (
            <p className="iz-tiny iz-muted2 -mt-1 text-center">
              Posted {s.quantity} · {adjustmentsLabel}
            </p>
          )}

          {canStaff && s.status === "confirmed" && showApplicantActions && (
            <OutletCutLossActions shift={s} />
          )}

          <ShiftTierWagesStrip tierRates={tierRates} compact />

          {canStaff && visibleApplicants.length > 0 && s.status !== "sealed" && (
            <div className="mt-2.5 space-y-1.5 rounded-xl bg-white/[0.02] p-2">
              <p className="text-[10px] font-semibold text-[var(--iz-muted)]">
                {showApplicantActions ? "Applicants" : "Requested PRs"} · {visibleApplicants.length}
              </p>
              {!showApplicantActions && (
                <p className="text-[10px] leading-snug text-[var(--iz-muted2)]">
                  Your agency approves or declines each request.
                </p>
              )}
              {visibleApplicants.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">
                    {a.prName} · {a.rating}★
                  </span>
                  {showApplicantActions ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => respondToApplicant(a.id, true)}
                        className="iz-topbar-action h-8 w-8 shrink-0 !text-[var(--iz-green)] hover:!text-[var(--iz-green)]"
                        aria-label={`Accept ${a.prName}`}
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToApplicant(a.id, false)}
                        className="iz-topbar-action h-8 w-8 shrink-0"
                        aria-label={`Decline ${a.prName}`}
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <IzPill variant="amber" className="!py-0.5 !text-[9px]">
                      Pending agency
                    </IzPill>
                  )}
                </div>
              ))}
            </div>
          )}

          {canLogSales && s.status === "confirmed" && !hideLogSales && (
            <OutletShiftSalesPanel shiftId={s.id} compact collapsible />
          )}
          {canLogSales && s.status === "sealed" && (
            <p className="iz-tiny iz-muted mt-2">Sales locked after seal.</p>
          )}

          <div className="mt-2.5 flex gap-2">
            {canDelete && s.status !== "sealed" && (
              <button
                type="button"
                onClick={() => setDeleteTargetId(s.id)}
                className="iz-chip !px-2.5 text-[var(--iz-muted)]"
                aria-label="Delete shift"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {canConfirm &&
              showApplicantActions &&
              s.status !== "confirmed" &&
              s.status !== "sealed" && (
                <button
                  type="button"
                  onClick={() => confirmShift(s.id)}
                  className="iz-btn iz-btn-primary iz-btn-sm min-w-0 flex-1"
                >
                  Confirm
                </button>
              )}
            {canSeal && s.status === "confirmed" && (
              <button
                type="button"
                onClick={() => setSealTargetId(s.id)}
                className="iz-btn iz-btn-soft iz-btn-sm min-w-0 flex-1 !border-[var(--iz-gold-d)] !text-[var(--iz-gold)]"
              >
                Seal shift
              </button>
            )}
            {s.status === "sealed" && (
              <span className="flex flex-1 items-center justify-center py-1.5">
                <IzPill variant="green">Payroll sent</IzPill>
              </span>
            )}
          </div>
        </div>
      </details>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {variant === "home" && liveShift && renderShiftCard(liveShift, true)}
        {variant === "home" && liveShift && (
          <OutletTodayOperationPanel shift={liveShift} outletName={outletWorkspace.outletName} />
        )}
        {variant === "future" && futureShifts.map((s) => renderShiftCard(s))}
      </div>

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

      <OutletSealReview
        shift={sealTarget ?? null}
        open={sealTarget !== null}
        onClose={() => setSealTargetId(null)}
        onConfirm={() => {
          if (sealTargetId) sealShift(sealTargetId);
          setSealTargetId(null);
        }}
      />
    </>
  );
}

function Metric({
  label,
  value,
  gold,
  green,
  red,
}: {
  label: string;
  value: string;
  gold?: boolean;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-1 py-1.5">
      <div className="text-[8px] font-semibold uppercase leading-tight tracking-wide text-[var(--iz-muted)]">
        {label}
      </div>
      <div
        className={cn(
          "font-sora mt-0.5 text-[11px] font-bold leading-tight",
          gold && "text-[var(--iz-gold)]",
          green && "text-[var(--iz-green)]",
          red && "text-[var(--iz-red)]",
          !gold && !green && !red && "text-[var(--iz-txt)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
