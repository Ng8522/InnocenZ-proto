import { useState } from "react";
import { useStore, type ShiftRequest } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { IzPill } from "@/components/iz/ui";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSealReview } from "@/components/outlet/OutletSealReview";
import { OutletCutLossActions } from "@/components/outlet/OutletCutLossActions";
import { ShiftTierWagesStrip } from "@/components/outlet/ShiftTierWagesStrip";
import {
  OutletActionButton,
  OutletApplicantRow,
  OutletStatChip,
  OutletTargetActualCard,
} from "@/components/outlet/outlet-portal-ui";
import {
  SHIFT_DESTINATION_LABELS,
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
  formatOutletShiftMetricAmount,
} from "@/lib/outlet-demo";
import { outletShiftDisplayLiveSales } from "@/lib/outlet-financial-sync";
import { trafficLevelForRatio } from "@/lib/traffic-status";
import { Check, CheckCircle2, Clock, Lock, PlayCircle, Trash2 } from "lucide-react";
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
  const demandLevel = trafficLevelForRatio(supplied, staffingDemand);
  const demandTone =
    demandLevel === "green" ? "neutral" : demandLevel === "yellow" ? "warn" : "violet";

  return (
    <>
      <div className="px-3.5 pb-3.5 pt-2">
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <OutletStatChip
            label="Demand / supplied"
            value={`${staffingDemand} / ${supplied}`}
            tone={demandTone}
          />
          <OutletStatChip
            label="Cutlost"
            value={formatOutletShiftMetricAmount(cutLoss)}
            tone={cutLoss > 0 ? "danger" : "neutral"}
          />
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <OutletTargetActualCard label="Sales" target={targetSales} actual={displaySales} />
          <OutletTargetActualCard
            label="Labor cost"
            target={targetCost}
            actual={actualCost}
            lowerIsBetter
          />
        </div>

        {adjustmentsLabel && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            Posted {shift.quantity} · {adjustmentsLabel}
          </p>
        )}

        {canStaff && shift.status === "confirmed" && showApplicantActions && (
          <OutletCutLossActions shift={shift} />
        )}

        <ShiftTierWagesStrip tierRates={tierRates} compact />

        {canStaff && visibleApplicants.length > 0 && shift.status !== "sealed" && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--iz-muted2)]">
                {showApplicantActions ? "Applicants" : "Requested PRs"}
              </p>
              <IzPill variant="amber" className="!py-0.5 !text-[9px]">
                {visibleApplicants.length} waiting
              </IzPill>
            </div>
            {!showApplicantActions && (
              <p className="text-[10px] leading-snug text-[var(--iz-muted2)]">
                Your agency approves or declines each request.
              </p>
            )}
            {visibleApplicants.map((a) =>
              showApplicantActions ? (
                <OutletApplicantRow
                  key={a.id}
                  name={a.prName}
                  meta={
                    <IzPill variant="gold" className="!py-0.5 !text-[9px]">
                      {a.rating}★
                    </IzPill>
                  }
                  onAccept={() => respondToApplicant(a.id, true)}
                  onDecline={() => respondToApplicant(a.id, false)}
                />
              ) : (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--iz-line2)] bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-xs">
                    {a.prName} · {a.rating}★
                  </span>
                  <IzPill variant="amber" className="!py-0.5 !text-[9px]">
                    Pending agency
                  </IzPill>
                </div>
              ),
            )}
          </div>
        )}

        {canLogSales && shift.status === "confirmed" && !hideLogSales && (
          <div className="mt-3">
            <OutletShiftSalesPanel shiftId={shift.id} label="Log sales" collapsible />
          </div>
        )}
        {canLogSales && shift.status === "sealed" && (
          <p className="iz-tiny iz-muted mt-2">Sales locked after seal.</p>
        )}

        <div className="mt-3 space-y-2">
          {canConfirm &&
            showApplicantActions &&
            shift.status !== "confirmed" &&
            shift.status !== "sealed" && (
              <OutletActionButton
                icon={Check}
                title="Confirm staffing"
                hint="Lock in PRs and mark this shift live"
                tone="green"
                onClick={() => confirmShift(shift.id)}
              />
            )}
          {canSeal && shift.status === "confirmed" && (
            <OutletActionButton
              icon={Lock}
              title="Seal shift"
              hint="Finalize sales and send payroll to agencies"
              tone="gold"
              onClick={() => setSealOpen(true)}
            />
          )}
          {canDelete && shift.status !== "sealed" && onDelete && (
            <OutletActionButton
              icon={Trash2}
              title="Cancel shift"
              hint="Remove this shift and release all PRs"
              tone="danger"
              onClick={onDelete}
            />
          )}
          {shift.status === "sealed" && (
            <div className="flex justify-center py-1">
              <IzPill variant="green">Payroll sent · shift sealed</IzPill>
            </div>
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
