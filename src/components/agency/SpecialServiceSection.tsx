import { useMemo, useState } from "react";
import { SpecialServiceFilters } from "@/components/agency/SpecialServiceFilters";
import { OutletSection } from "@/components/outlet/OutletSection";
import { SpecialServiceOrderCard } from "@/components/special-service/SpecialServiceOrderCard";
import {
  SpecialServiceOrderSheet,
  type SpecialServiceOrderDraft,
} from "@/components/special-service/SpecialServiceOrderSheet";
import { IzCard, formatRM } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import { OUTLET_NAMES } from "@/lib/agency-demo";
import { AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";
import {
  bookableServiceOffers,
  EMPTY_SPECIAL_SERVICE_FILTERS,
  collectSpecialServiceAmountInOptions,
  collectSpecialServiceAmountOutOptions,
  collectSpecialServiceDateIsos,
  filterSpecialServiceRecords,
  specialServiceOffer,
} from "@/lib/special-service-demo";
import { pendingSpecialServicesForAgency } from "@/lib/special-service-actions";
import { Plus, Truck } from "lucide-react";

const OUTLET_OPTIONS = ["Agency service", ...OUTLET_NAMES];
const AGENCY_SERVICE_OFFERS = bookableServiceOffers("agency");

export function SpecialServiceSection({ canBook }: { canBook: boolean }) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const records = useStore((s) => s.specialServiceOrders);
  const submitOrder = useStore((s) => s.submitSpecialServiceOrder);
  const approveOrder = useStore((s) => s.approveSpecialServiceByAgency);
  const declineOrder = useStore((s) => s.declineSpecialServiceByAgency);

  const [bookingFilters, setBookingFilters] = useState(EMPTY_SPECIAL_SERVICE_FILTERS);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [draft, setDraft] = useState<SpecialServiceOrderDraft>({
    prId: agencyPRs[0]?.id ?? "",
    outlet: OUTLET_OPTIONS[1] ?? "Velvet 23",
    serviceType: AGENCY_SERVICE_OFFERS[0]?.id ?? "transportation",
    amountOut: String(AGENCY_SERVICE_OFFERS[0]?.defaultRate ?? ""),
    amountIn: "",
    time: "19:00",
    note: "",
  });

  const bookingDateIsos = useMemo(() => collectSpecialServiceDateIsos(records), [records]);
  const amountInOptions = useMemo(() => collectSpecialServiceAmountInOptions(records), [records]);
  const amountOutOptions = useMemo(() => collectSpecialServiceAmountOutOptions(records), [records]);

  const filtered = useMemo(
    () => filterSpecialServiceRecords(records, bookingFilters),
    [records, bookingFilters],
  );

  const pendingReview = pendingSpecialServicesForAgency(records).length;
  const awaitingAccept = records.filter(
    (r) =>
      r.initiatedBy === "agency" &&
      (r.prAcceptance === "pending" || r.outletAcceptance === "pending"),
  ).length;
  const confirmedTotal = records
    .filter((r) => r.status === "confirmed")
    .reduce((s, r) => s + r.amountOut, 0);

  const openRaise = () => {
    const offer = specialServiceOffer(draft.serviceType) ?? AGENCY_SERVICE_OFFERS[0];
    setDraft((prev) => ({
      ...prev,
      prId: prev.prId || agencyPRs[0]?.id || "",
      amountOut: String(offer?.defaultRate ?? ""),
      amountIn: "",
      note: "",
    }));
    setRaiseOpen(true);
  };

  const submitDraft = () => {
    const pr = agencyPRs.find((p) => p.id === draft.prId);
    const offer = specialServiceOffer(draft.serviceType);
    const amountOut = Number(draft.amountOut);
    const amountIn = draft.amountIn ? Number(draft.amountIn) : 0;
    if (!pr || !offer || !Number.isFinite(amountOut) || amountOut <= 0) return;
    if (draft.amountIn && (!Number.isFinite(amountIn) || amountIn < 0)) return;

    const raisedBy = AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"];
    submitOrder({
      initiatedBy: "agency",
      raisedBy,
      prId: pr.id,
      prName: pr.name,
      outlet: draft.outlet,
      serviceType: offer.id,
      description: draft.note.trim() || offer.summary,
      amountIn,
      amountOut,
      time: draft.time,
    });
    setRaiseOpen(false);
    setDraft((prev) => ({ ...prev, note: "" }));
  };

  const prOptions = agencyPRs.filter((p) => !p.detached).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="mt-3">
      <div className="iz-grid2">
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-amber)]">{pendingReview}</div>
          <div className="l">Orders to review</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-violet-l)]">{awaitingAccept}</div>
          <div className="l">Awaiting PR / outlet</div>
        </div>
      </div>

      <IzCard flat className="mt-2.5 border-[rgba(159,122,234,.25)] bg-[linear-gradient(180deg,rgba(159,122,234,.06),transparent)]">
        <p className="iz-tiny iz-muted2 leading-relaxed">
          <Truck className="mr-1 inline h-3 w-3 text-[var(--iz-violet-l)]" />
          Review orders from outlets and PRs. Book services on their behalf — they will be notified to
          accept or decline. Confirmed charges ({formatRM(confirmedTotal)}) roll into payroll.
        </p>
      </IzCard>

      <IzCard flat className="iz-pr-manage-filters-card !mt-3">
        <SpecialServiceFilters
          filters={bookingFilters}
          onChange={(patch) => setBookingFilters((prev) => ({ ...prev, ...patch }))}
          bookingDateIsos={bookingDateIsos}
          amountInOptions={amountInOptions}
          amountOutOptions={amountOutOptions}
          resultCount={filtered.length}
          totalCount={records.length}
        />
      </IzCard>

      {canBook && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="iz-btn iz-btn-primary !py-2 !text-xs" onClick={openRaise}>
            <Plus className="h-3.5 w-3.5" /> Book for PR / outlet
          </button>
        </div>
      )}

      <OutletSection
        title="All service orders"
        hint={`${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
        className="!mt-3"
      >
        {filtered.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No service orders match this filter</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <SpecialServiceOrderCard
                key={row.id}
                row={row}
                role="agency"
                onApprove={canBook ? approveOrder : undefined}
                onDecline={canBook ? declineOrder : undefined}
              />
            ))}
          </div>
        )}
      </OutletSection>

      <IzSheet open={raiseOpen} onClose={() => setRaiseOpen(false)}>
        <SpecialServiceOrderSheet
          role="agency"
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          prOptions={prOptions}
          outletOptions={OUTLET_OPTIONS}
          showOutletPicker
          showAmountIn
          serviceOffers={AGENCY_SERVICE_OFFERS}
          onSubmit={submitDraft}
          submitLabel="Book & notify"
        />
      </IzSheet>
    </div>
  );
}
