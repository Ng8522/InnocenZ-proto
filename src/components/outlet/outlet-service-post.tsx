import { useMemo, useState } from "react";
import { format, startOfToday } from "date-fns";
import { Check, ChevronRight, Pencil, Plus, Sparkles, X } from "lucide-react";
import { SpecialServiceFilters } from "@/components/agency/SpecialServiceFilters";
import { IzCard, IzSectionLabel, IzTimeInput, formatRM } from "@/components/iz/ui";
import { IzHScroll } from "@/components/iz/HScroll";
import { OutletSection } from "@/components/outlet/OutletSection";
import {
  JobDatePicker,
  formatJobDate,
} from "@/components/outlet/post-job-fields";
import { SpecialServiceOrderCard } from "@/components/special-service/SpecialServiceOrderCard";
import { useStore } from "@/lib/store";
import { isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import {
  EMPTY_SPECIAL_SERVICE_FILTERS,
  bookableServiceOffers,
  collectSpecialServiceAmountInOptions,
  collectSpecialServiceAmountOutOptions,
  collectSpecialServiceDateIsos,
  filterSpecialServiceRecords,
  specialServiceOffer,
  specialServiceTypeLabel,
  type AgencySpecialServiceOffer,
} from "@/lib/special-service-demo";
import {
  pendingSpecialServicesForOutlet,
  specialServicesForOutlet,
} from "@/lib/special-service-actions";
import { cn } from "@/lib/utils";

export type DraftServiceOrder = {
  id: string;
  jobDate: Date;
  serviceType: string;
  prId: string;
  time: string;
  amountIn: string;
  note: string;
};

export function newDraftService(
  partial: Partial<Omit<DraftServiceOrder, "id">> | undefined,
  _outletName: string,
  offers: AgencySpecialServiceOffer[],
): DraftServiceOrder {
  const first = offers[0];
  return {
    id: `svc-draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    jobDate: partial?.jobDate ?? startOfToday(),
    serviceType: partial?.serviceType ?? first?.id ?? "transportation",
    prId: partial?.prId ?? "",
    time: partial?.time ?? "19:00",
    amountIn: partial?.amountIn ?? (first ? String(first.defaultRate) : ""),
    note: partial?.note ?? "",
  };
}

function ServiceFormRow({
  label,
  children,
  stacked,
  alignTop,
  last,
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
  alignTop?: boolean;
  last?: boolean;
}) {
  if (stacked) {
    return (
      <div className={`flex flex-col gap-1.5 py-2.5 ${last ? "" : "border-b border-[var(--iz-line)]"}`}>
        <span className="text-xs text-[var(--iz-muted)]">{label}</span>
        <div className="min-w-0 w-full">{children}</div>
      </div>
    );
  }
  return (
    <div
      className={`flex gap-3 py-2.5 ${alignTop ? "items-start" : "items-center"} ${last ? "" : "border-b border-[var(--iz-line)]"}`}
    >
      <span className="shrink-0 text-xs text-[var(--iz-muted)]">{label}</span>
      <div className="ml-auto flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

function ServicePrPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (prId: string) => void;
}) {
  const prs = useStore((s) => s.prs);
  const candidates = useMemo(() => [...prs].sort((a, b) => b.rating - a.rating), [prs]);

  if (candidates.length === 0) {
    return <p className="text-[11px] text-[var(--iz-muted)]">No PRs available.</p>;
  }

  return (
    <IzHScroll className="-mx-1 flex gap-2 pb-1">
      {candidates.map((p) => {
        const on = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "iz-card iz-card-flat w-[118px] shrink-0 snap-start !mb-0 p-2.5 text-left",
              on && "ring-1 ring-[var(--iz-gold-d)]",
            )}
          >
            <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--iz-violet-ink)] text-3xl">
              {p.avatar}
            </div>
            <div className="mt-1.5 truncate text-xs font-semibold text-[var(--iz-txt)]">{p.name}</div>
            <div className="text-[10px] text-[var(--iz-gold)]">{p.rating}★</div>
            <div
              className={cn(
                "mt-1.5 flex w-full items-center justify-center gap-0.5 rounded-full py-1 text-[10px] font-semibold",
                on ? "bg-[var(--iz-green-bg)] text-[var(--iz-green)]" : "bg-[rgba(255,255,255,0.06)] text-[var(--iz-muted)]",
              )}
            >
              {on ? (
                <>
                  <Check className="h-3 w-3" /> Selected
                </>
              ) : (
                "Tap to select"
              )}
            </div>
          </button>
        );
      })}
    </IzHScroll>
  );
}

function DraftServiceEditor({
  draft,
  onChange,
  offers,
  title,
  onRemove,
  showRemove,
  onDone,
}: {
  draft: DraftServiceOrder;
  onChange: (patch: Partial<DraftServiceOrder>) => void;
  offers: AgencySpecialServiceOffer[];
  title: string;
  onRemove?: () => void;
  showRemove?: boolean;
  onDone?: () => void;
}) {
  const offer = specialServiceOffer(draft.serviceType);

  return (
    <IzCard className="!mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">{title}</span>
        <div className="flex items-center gap-1.5">
          {onDone && (
            <button type="button" onClick={onDone} className="iz-chip px-2 py-1 text-[11px] font-semibold text-[var(--iz-gold)]">
              Done
            </button>
          )}
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
              aria-label={`Remove ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <ServiceFormRow label="Date">
        <JobDatePicker value={draft.jobDate} onChange={(jobDate) => onChange({ jobDate })} />
      </ServiceFormRow>
      <ServiceFormRow label="Service type" alignTop stacked>
        <IzHScroll className="flex w-full gap-1 pb-0.5">
          {offers.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  serviceType: option.id,
                  amountIn: String(option.defaultRate),
                })
              }
              className={cn(
                "iz-pill shrink-0 whitespace-nowrap !text-[10px]",
                draft.serviceType === option.id ? "iz-pill-gold" : "iz-pill-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </IzHScroll>
        {offer && <p className="mt-2 text-[10px] leading-snug text-[var(--iz-muted2)]">{offer.summary}</p>}
      </ServiceFormRow>
      <ServiceFormRow label="Time">
        <IzTimeInput
          value={draft.time}
          onChange={(time) => onChange({ time })}
          className="max-w-[120px] !text-sm"
          aria-label="Service time"
        />
      </ServiceFormRow>
      <ServiceFormRow label="Amount in (RM)" stacked>
        <input
          type="number"
          min={0}
          step={5}
          className="w-full rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm font-semibold outline-none"
          placeholder={offer ? String(offer.defaultRate) : "0"}
          value={draft.amountIn}
          onChange={(e) => onChange({ amountIn: e.target.value })}
        />
        {offer && (
          <p className="mt-1 text-[10px] text-[var(--iz-muted2)]">
            Agency cost {formatRM(offer.defaultRate)} · outlet recovery
          </p>
        )}
      </ServiceFormRow>
      <ServiceFormRow label="Notes" stacked last={false}>
        <textarea
          className="min-h-[72px] w-full rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-2 text-sm outline-none"
          placeholder="Pickup address, delivery items, outlet contact…"
          value={draft.note}
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </ServiceFormRow>
      <ServiceFormRow label="Select PR" stacked last>
        <ServicePrPicker selected={draft.prId} onChange={(prId) => onChange({ prId })} />
      </ServiceFormRow>
    </IzCard>
  );
}

function DraftServiceSummary({
  draft,
  title,
  prName,
  onEdit,
  onRemove,
  showRemove,
}: {
  draft: DraftServiceOrder;
  title: string;
  prName: string;
  onEdit: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  const offer = specialServiceOffer(draft.serviceType);
  return (
    <IzCard className="!mb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">{title}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onEdit} className="iz-chip flex items-center gap-1 px-2 py-1 text-[11px] font-semibold">
            <Pencil className="h-3 w-3" /> Edit
          </button>
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
              aria-label={`Remove ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-0 text-sm">
        <SummaryLine label="Date" value={formatJobDate(draft.jobDate)} />
        <SummaryLine label="Service" value={specialServiceTypeLabel(draft.serviceType)} stacked />
        <SummaryLine label="Time" value={draft.time} />
        <SummaryLine label="PR" value={prName || "—"} />
        <SummaryLine
          label="Amount in"
          value={draft.amountIn ? `RM ${Number(draft.amountIn).toLocaleString()}` : offer ? formatRM(offer.defaultRate) : "—"}
        />
        {draft.note.trim() && <SummaryLine label="Notes" value={draft.note} stacked />}
      </div>
    </IzCard>
  );
}

function SummaryLine({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 border-b border-[var(--iz-line)] py-2.5 last:border-0">
        <span className="text-xs text-[var(--iz-muted)]">{label}</span>
        <span className="break-words text-right text-sm leading-snug text-[var(--iz-txt)]">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--iz-line)] py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-[var(--iz-muted)]">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-[var(--iz-txt)]">{value}</span>
    </div>
  );
}

export function OutletServicePostSection() {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prs = useStore((s) => s.prs);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const records = useStore((s) => s.specialServiceOrders);
  const submitOrder = useStore((s) => s.submitSpecialServiceOrder);
  const acceptByOutlet = useStore((s) => s.acceptSpecialServiceByOutlet);
  const declineByOutlet = useStore((s) => s.declineSpecialServiceByOutlet);
  const toast = useStore((s) => s.toast);

  const outletName = outletWorkspace.outletName;
  const serviceOffers = useMemo(() => bookableServiceOffers("outlet"), []);
  const defaultPrId = agencyPRs.find((p) => !p.detached)?.id ?? prs[0]?.id ?? "";

  const [composer, setComposer] = useState<DraftServiceOrder>(() =>
    newDraftService({ prId: defaultPrId }, outletName, serviceOffers),
  );
  const [draftOrders, setDraftOrders] = useState<DraftServiceOrder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingFilters, setBookingFilters] = useState(EMPTY_SPECIAL_SERVICE_FILTERS);

  const scopedRecords = useMemo(
    () => specialServicesForOutlet(records, outletName),
    [records, outletName],
  );
  const pendingAction = useMemo(
    () => pendingSpecialServicesForOutlet(records, outletName),
    [records, outletName],
  );
  const bookingDateIsos = useMemo(() => collectSpecialServiceDateIsos(scopedRecords), [scopedRecords]);
  const amountInOptions = useMemo(() => collectSpecialServiceAmountInOptions(scopedRecords), [scopedRecords]);
  const amountOutOptions = useMemo(() => collectSpecialServiceAmountOutOptions(scopedRecords), [scopedRecords]);
  const filtered = useMemo(
    () => filterSpecialServiceRecords(scopedRecords, bookingFilters),
    [scopedRecords, bookingFilters],
  );

  const sectionDate =
    draftOrders.length > 0 ? formatJobDate(draftOrders[0].jobDate) : formatJobDate(composer.jobDate);
  const totalAgencyCost = draftOrders.reduce((sum, d) => {
    const offer = specialServiceOffer(d.serviceType);
    return sum + (offer?.defaultRate ?? 0);
  }, 0);

  const prNameFor = (prId: string) =>
    agencyPRs.find((p) => p.id === prId)?.name ?? prs.find((p) => p.id === prId)?.name ?? "—";

  const addDraft = () => {
    if (!composer.prId) {
      toast("Select a PR for this service", "warn");
      return;
    }
    setDraftOrders((cur) => [...cur, { ...composer, id: `svc-draft-${Date.now()}` }]);
    setComposer(newDraftService({ prId: defaultPrId }, outletName, serviceOffers));
    setEditingId(null);
  };

  const submitAll = () => {
    if (draftOrders.length === 0) return;
    for (const d of draftOrders) {
      const offer = specialServiceOffer(d.serviceType);
      if (!offer || !d.prId) continue;
      const pr = agencyPRs.find((p) => p.id === d.prId) ?? prs.find((p) => p.id === d.prId);
      const amountIn = d.amountIn ? Number(d.amountIn) : offer.defaultRate;
      submitOrder({
        initiatedBy: "outlet",
        raisedBy: outletName,
        prId: d.prId,
        prName: pr?.name ?? d.prId,
        outlet: outletName,
        serviceType: d.serviceType,
        description: d.note.trim() || offer.summary,
        amountIn: Number.isFinite(amountIn) ? amountIn : offer.defaultRate,
        amountOut: offer.defaultRate,
        time: d.time,
        dateIso: isoKeyFromDate(d.jobDate),
      });
    }
    setDraftOrders([]);
    setComposer(newDraftService({ prId: defaultPrId }, outletName, serviceOffers));
    setEditingId(null);
  };

  return (
    <>
      {pendingAction.length > 0 && (
        <IzCard flat className="mb-3 border-[rgba(159,122,234,.35)] bg-[linear-gradient(180deg,rgba(159,122,234,.08),transparent)]">
          <p className="iz-tiny font-semibold text-[var(--iz-violet-l)]">
            {pendingAction.length} booking{pendingAction.length !== 1 ? "s" : ""} need your response
          </p>
          <div className="mt-2 space-y-2">
            {pendingAction.map((row) => (
              <SpecialServiceOrderCard
                key={row.id}
                row={row}
                role="outlet"
                onAccept={acceptByOutlet}
                onDecline={declineByOutlet}
              />
            ))}
          </div>
        </IzCard>
      )}

      <IzCard flat className="border-[rgba(159,122,234,.2)] bg-[linear-gradient(180deg,rgba(159,122,234,.04),transparent)]">
        <p className="iz-tiny iz-muted2 leading-relaxed">
          <Sparkles className="mr-1 inline h-3 w-3 text-[var(--iz-violet-l)]" />
          Order agency add-ons for your venue — delivery, emergency cover, styling, and more.
        </p>
      </IzCard>

      <section className="pt-3">
        <DraftServiceEditor
          draft={composer}
          onChange={(patch) => setComposer((c) => ({ ...c, ...patch }))}
          offers={serviceOffers}
          title="Service details"
        />

        <button type="button" onClick={addDraft} className="iz-btn iz-btn-soft mt-2 w-full">
          <Plus className="h-4 w-4" />
          {draftOrders.length === 0 ? "Add service" : "Add another service"}
        </button>

        <div className="mt-4 flex items-center justify-between">
          <IzSectionLabel>Services for {sectionDate.toLowerCase()}</IzSectionLabel>
          <span className="text-[10px] text-[var(--iz-muted)]">
            {draftOrders.length} order{draftOrders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {draftOrders.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center text-xs text-[var(--iz-muted)]">
            No services added yet. Configure details above, then tap Add service.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {draftOrders.map((d, i) =>
              editingId === d.id ? (
                <DraftServiceEditor
                  key={d.id}
                  draft={d}
                  onChange={(patch) =>
                    setDraftOrders((cur) => cur.map((s) => (s.id === d.id ? { ...s, ...patch } : s)))
                  }
                  offers={serviceOffers}
                  title={`Service ${i + 1}`}
                  onRemove={() => setDraftOrders((cur) => cur.filter((s) => s.id !== d.id))}
                  showRemove
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <DraftServiceSummary
                  key={d.id}
                  draft={d}
                  title={`Service ${i + 1}`}
                  prName={prNameFor(d.prId)}
                  onEdit={() => setEditingId(d.id)}
                  onRemove={() => setDraftOrders((cur) => cur.filter((s) => s.id !== d.id))}
                  showRemove
                />
              ),
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Orders queued" value={String(draftOrders.length)} />
          <Stat label="Est. agency cost" value={`RM ${totalAgencyCost.toLocaleString()}`} valueClass="text-[var(--iz-gold)]" />
        </div>

        <button
          type="button"
          onClick={submitAll}
          disabled={draftOrders.length === 0}
          className="iz-btn iz-btn-primary mt-3 w-full disabled:opacity-40"
        >
          Submit{draftOrders.length > 0 ? ` ${draftOrders.length}` : ""} service
          {draftOrders.length !== 1 ? "s" : ""} to agency <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <IzCard flat className="iz-pr-manage-filters-card !mt-4">
        <SpecialServiceFilters
          filters={bookingFilters}
          onChange={(patch) => setBookingFilters((prev) => ({ ...prev, ...patch }))}
          bookingDateIsos={bookingDateIsos}
          amountInOptions={amountInOptions}
          amountOutOptions={amountOutOptions}
          resultCount={filtered.length}
          totalCount={scopedRecords.length}
        />
      </IzCard>

      <OutletSection
        title="Your service orders"
        hint={`${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
        collapsible
        defaultOpen={false}
        className="!mt-3"
      >
        {filtered.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No service orders yet</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <SpecialServiceOrderCard key={row.id} row={row} role="outlet" />
            ))}
          </div>
        )}
      </OutletSection>
    </>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="iz-stat-tile">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">{label}</div>
      <div className={`font-sora mt-1.5 text-xl font-extrabold ${valueClass || "text-[var(--iz-txt)]"}`}>{value}</div>
    </div>
  );
}
