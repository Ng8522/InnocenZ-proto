import { useMemo, useState } from "react";
import { useStore, type ShiftRequest } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { IzPill } from "@/components/iz/ui";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSealReview } from "@/components/outlet/OutletSealReview";
import { OutletCutLossActions } from "@/components/outlet/OutletCutLossActions";
import { WorkspaceTierRatesEditor } from "@/components/outlet/WorkspaceTierRatesEditor";
import {
  SHIFT_DESTINATION_LABELS,
  formatOutletShiftDualMetric,
  formatOutletShiftMetricAmount,
  formatShiftDrinkPricingSummary,
  formatShiftEventTypeSummary,
  shiftSpecialEventLabel,
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
import { resolveOutletShiftDateIso } from "@/lib/agency-outlet-shifts";
import { shiftTierStaffingByPayTier } from "@/lib/post-job-pay-tiers";
import { getLiveTodayIso } from "@/lib/demo-clock";
import { Check, CheckCircle2, Clock, Lock, PlayCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META = {
  sealed: { tone: "iz-pill-ink", icon: Lock, label: "Sealed" },
  confirmed: { tone: "iz-pill-green", icon: CheckCircle2, label: "Live" },
  open: { tone: "iz-pill-amber", icon: PlayCircle, label: "Open" },
  draft: { tone: "iz-pill-violet", icon: Clock, label: "Draft" },
} as const;

export function OutletShiftStatusBadge({ shift }: { shift: ShiftRequest }) {
  const meta = STATUS_META[shift.status] ?? STATUS_META.draft;
  const StatusIcon = meta.icon;
  return (
    <span className={cn("iz-pill shrink-0 !py-0.5 !text-[9px]", meta.tone)}>
      <StatusIcon className="mr-0.5 inline h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

export function OutletShiftDetailPanel({
  shift,
  variant = "future",
  hideLogSales = false,
  staffingAgency,
  onDelete,
}: {
  shift: ShiftRequest;
  variant?: "home" | "future";
  hideLogSales?: boolean;
  /** When set, show linked agency instead of destination/freelancer labels. */
  staffingAgency?: string;
  onDelete?: () => void;
}) {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const { confirmShift, sealShift, shiftApplicants, respondToApplicant } = useStore();

  const canLogSales = outletCan(outletSubRole, "logSales");
  const canConfirm = outletCan(outletSubRole, "confirmShift");
  const canSeal = outletCan(outletSubRole, "sealShift");
  const canDelete = outletCan(outletSubRole, "postJob");
  const canStaff = outletCan(outletSubRole, "manageShiftStaffing");

  const [sealOpen, setSealOpen] = useState(false);

  const showApplicantActions = variant !== "future";
  const todayIso = getLiveTodayIso();
  const shiftDateIso = resolveOutletShiftDateIso(shift.date, shift.dateIso, todayIso);
  const showCutlost = variant === "home" || shiftDateIso === todayIso;
  const applicants = shiftApplicants.filter((a) => a.shiftId === shift.id && a.status === "pending");
  const outletRequests = applicants.filter((a) => a.source === "outlet_request");
  const freelancerApplicants = applicants.filter((a) => a.source !== "outlet_request");
  const visibleApplicants = showApplicantActions ? freelancerApplicants : outletRequests;

  const drinkLines = shiftDrinkMenuDetailLines(shift, outletWorkspace.drinkMenu ?? []);
  const eventTypeLabel = formatShiftEventTypeSummary(
    shift.eventKind ?? "normal",
    shift.specialEventType,
    shift.customSpecialEventName,
  );
  const drinkPricingLabel = formatShiftDrinkPricingSummary(shift, outletWorkspace.drinkMenu ?? []);
  const tierRates = resolveShiftTierRates(shift, outletWorkspace);
  const prTierById = Object.fromEntries(agencyPRs.map((pr) => [pr.id, pr.trainingLevel]));
  const targetSales = outletShiftTargetSalesForShift(shift, tierRates);
  const targetCost = outletShiftTargetLaborCost(shift, tierRates, prTierById);
  const actualCost = outletShiftActualLaborCost(shift, tierRates, prTierById);
  const displaySales = outletShiftDisplayLiveSales(shift);
  const cutLoss = outletShiftCutLoss(targetCost, actualCost);
  const { demand: staffingDemand, supplied } = outletShiftDemandSupplied(shift);
  const adjustmentsLabel = outletShiftCutLossAdjustmentsLabel(shift);
  const tierStaffingByPayTier = useMemo(
    () =>
      shiftTierStaffingByPayTier({
        payTierRows: shift.payTierRows,
        quantity: shift.quantity,
        tierRates,
        bookedPrIds: shift.prs,
        agencyPRs,
      }),
    [shift.payTierRows, shift.quantity, shift.prs, tierRates, agencyPRs],
  );

  return (
    <>
      <div className="border-t border-[var(--iz-line)] px-3.5 pb-3.5 pt-2">
        {!staffingAgency && <p className="iz-tiny iz-muted2">{shift.shift}</p>}
        <div className={cn(!staffingAgency && "mt-1", "space-y-0.5")}>
          <p className="iz-tiny iz-muted2">
            <span className="text-[var(--iz-muted)]">Event type · </span>
            {eventTypeLabel}
          </p>
          <p className="iz-tiny iz-muted2">
            <span className="text-[var(--iz-muted)]">Drink prices · </span>
            {drinkPricingLabel}
          </p>
          {shift.eventKind === "special" && drinkLines.length > 0 && (
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
        {(shift.dressCode || staffingAgency || shift.destination) && (
          <p className="iz-tiny iz-muted2 mt-0.5">
            {[shift.dressCode, staffingAgency ?? (shift.destination && SHIFT_DESTINATION_LABELS[shift.destination])]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div
          className={cn(
            "mt-2.5 grid gap-1.5 text-center text-[10px]",
            showCutlost ? "grid-cols-4" : "grid-cols-3",
          )}
        >
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
          {showCutlost && (
            <Metric label="Cutlost" value={formatOutletShiftMetricAmount(cutLoss)} red={cutLoss > 0} />
          )}
        </div>
        {adjustmentsLabel && (
          <p className="iz-tiny iz-muted2 -mt-1 text-center">
            Posted {shift.quantity} · {adjustmentsLabel}
          </p>
        )}

        {canStaff && shift.status === "confirmed" && showCutlost && (
          <OutletCutLossActions shift={shift} />
        )}

        <div className="mt-2.5">
          <WorkspaceTierRatesEditor
            tierRates={tierRates}
            commissionOnlyRates={outletWorkspace.commissionOnlyRates}
            onPatchTier={() => {}}
            onPatchCommissionOnly={() => {}}
            readOnly
            tierStaffingByPayTier={tierStaffingByPayTier}
          />
        </div>

        {canStaff && visibleApplicants.length > 0 && shift.status !== "sealed" && (
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

        {canLogSales && shift.status === "confirmed" && !hideLogSales && (
          <OutletShiftSalesPanel shiftId={shift.id} compact collapsible />
        )}
        {canLogSales && shift.status === "sealed" && (
          <p className="iz-tiny iz-muted mt-2">Sales locked after seal.</p>
        )}

        <div className="mt-2.5 flex gap-2">
          {canDelete && shift.status !== "sealed" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="iz-chip !px-2.5 text-[var(--iz-muted)]"
              aria-label="Delete shift"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {canConfirm &&
            showApplicantActions &&
            shift.status !== "confirmed" &&
            shift.status !== "sealed" && (
              <button
                type="button"
                onClick={() => confirmShift(shift.id)}
                className="iz-btn iz-btn-primary iz-btn-sm min-w-0 flex-1"
              >
                Confirm
              </button>
            )}
          {canSeal && shift.status === "confirmed" && (
            <button
              type="button"
              onClick={() => setSealOpen(true)}
              className="iz-btn iz-btn-soft iz-btn-sm min-w-0 flex-1 !border-[var(--iz-gold-d)] !text-[var(--iz-gold)]"
            >
              Seal shift
            </button>
          )}
          {shift.status === "sealed" && (
            <span className="flex flex-1 items-center justify-center py-1.5">
              <IzPill variant="green">Payroll sent</IzPill>
            </span>
          )}
        </div>
      </div>

      <OutletSealReview
        shift={shift}
        open={sealOpen}
        onClose={() => setSealOpen(false)}
        onConfirm={() => {
          sealShift(shift.id);
          setSealOpen(false);
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
