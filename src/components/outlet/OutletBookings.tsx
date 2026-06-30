import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { outletHomeShiftRequests } from "@/lib/agency-outlet-shifts";
import { PR_AGENCY_TIED_OFFERS } from "@/lib/pr-features";
import { outletCan } from "@/lib/outlet-rbac";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import { OutletTodayOperationPanel } from "@/components/outlet/OutletTodayOperationPanel";
import {
  shiftSpecialEventLabel,
  outletShiftDemandSupplied,
  resolveShiftTierRates,
} from "@/lib/outlet-demo";
import { outletShiftDisplayLiveSales } from "@/lib/outlet-financial-sync";
import { formatTierSalesTargets, formatTierWageRange } from "@/lib/agency-demo";
import {
  OutletShiftDetailPanel,
  OutletShiftStatusBadge,
} from "@/components/outlet/OutletShiftDetailPanel";
import { ChevronDown, Trash2 } from "lucide-react";

export function OutletBookings({ variant = "home" }: { variant?: "home" | "future" }) {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const { shifts, deleteShift } = useStore();
  const canDelete = outletCan(outletSubRole, "postJob");

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

  const liveShift =
    visibleShifts.find((s) => s.status === "confirmed" && s.date === "Tonight") ??
    visibleShifts.find((s) => s.status === "confirmed");
  const futureShifts = liveShift
    ? visibleShifts.filter((s) => s.id !== liveShift.id)
    : visibleShifts;

  const defaultOpenId = variant === "future" ? futureShifts[0]?.id : undefined;
  const deleteTarget = deleteTargetId ? visibleShifts.find((s) => s.id === deleteTargetId) : null;

  if (variant === "home" && !liveShift) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No live shift tonight — check Calendar page for upcoming events.
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
    const tierRates = resolveShiftTierRates(s, outletWorkspace);
    const targetPay = formatTierWageRange(tierRates);
    const salesTargets = formatTierSalesTargets(tierRates);
    const displaySales = outletShiftDisplayLiveSales(s);
    const { supplied } = outletShiftDemandSupplied(s);

    return (
      <details key={s.id} className="iz-outlet-booking-card group" open={s.id === defaultOpenId}>
        <summary className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{s.event}</span>
              {s.eventKind === "special" && (
                <IzPill variant="gold" className="shrink-0 !py-0.5 !text-[9px]">
                  {shiftSpecialEventLabel(s.specialEventType, s.customSpecialEventName)}
                </IzPill>
              )}
              <OutletShiftStatusBadge shift={s} />
            </div>
            <p className="iz-tiny iz-muted mt-0.5 truncate group-open:hidden">
              {s.date} · {supplied}/{s.quantity} PRs · {targetPay}
              {salesTargets ? ` · ${salesTargets}` : ""} · RM {displaySales.toLocaleString()} sales
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iz-muted)] transition-transform group-open:rotate-180" />
        </summary>

        <OutletShiftDetailPanel
          shift={s}
          variant={variant}
          hideLogSales={hideLogSales}
          onDelete={canDelete && s.status !== "sealed" ? () => setDeleteTargetId(s.id) : undefined}
        />
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
    </>
  );
}
