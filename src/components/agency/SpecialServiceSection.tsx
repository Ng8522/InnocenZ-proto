import { useMemo, useState } from "react";
import { startOfToday } from "date-fns";
import { ChevronRight, Pencil, Plus, X } from "lucide-react";
import { SpecialServiceFilters } from "@/components/agency/SpecialServiceFilters";
import { IzTimeInput, formatRM } from "@/components/iz/ui";
import { JobMultiDatePicker, formatJobDates } from "@/components/outlet/post-job-fields";
import { useStore } from "@/lib/store";
import { OUTLET_NAMES } from "@/lib/agency-demo";
import { AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";
import { isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import { cn } from "@/lib/utils";
import {
  EMPTY_SPECIAL_SERVICE_FILTERS,
  agencyJobPostingInzLabel,
  agencyJobPostingStatusTone,
  bookableServiceOffers,
  collectSpecialServiceDateIsos,
  filterSpecialServiceRecords,
  specialServiceOffer,
  specialServiceRemarkHint,
  specialServiceTypeLabel,
  type AgencyJobPostingStatusTone,
  type AgencySpecialServiceOffer,
  type SpecialServiceRecord,
} from "@/lib/special-service-demo";
import { agencyPostedSpecialServices } from "@/lib/special-service-actions";

const DEFAULT_OUTLET = OUTLET_NAMES[0] ?? "Velvet 23";

type AgencyJobDraft = {
  selectedDateIsos: string[];
  serviceType: string;
  time: string;
  budget: string;
  remark: string;
};

type QueuedAgencyJob = AgencyJobDraft & { id: string };

function newAgencyJobDraft(offers: AgencySpecialServiceOffer[]): AgencyJobDraft {
  const first = offers[0];
  return {
    selectedDateIsos: [isoKeyFromDate(startOfToday())],
    serviceType: first?.id ?? "transportation",
    time: "19:00",
    budget: "",
    remark: "",
  };
}

function parseDraftAmounts(draft: AgencyJobDraft) {
  const budget = draft.budget ? Number(draft.budget) : 0;
  const offer = specialServiceOffer(draft.serviceType);
  if (!offer) return null;
  if (!draft.budget.trim() || !Number.isFinite(budget) || budget <= 0) return null;
  return { budget, offer };
}

function formatPostedJobCost(amountOut: number): string {
  return amountOut > 0 ? formatRM(amountOut) : "—";
}

function newQueuedJob(draft: AgencyJobDraft): QueuedAgencyJob {
  return { ...draft, id: `job-draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
}

function daysInDraft(draft: Pick<AgencyJobDraft, "selectedDateIsos">): number {
  return draft.selectedDateIsos.length;
}

const JOB_TABLE_HEADERS = ["Date", "Type", "Budget", "Time", "Status", "Remark", "Cost"] as const;

function JobTableHead() {
  return (
    <thead>
      <tr>
        {JOB_TABLE_HEADERS.map((label, i) => (
          <th key={label} className={i === 2 || i === 6 ? "text-right" : undefined}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function JobPostingMicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("iz-job-posting-micro-label", className)}>{children}</span>
  );
}

function JobStatusBadge({ tone, label }: { tone: AgencyJobPostingStatusTone | "queued"; label: string }) {
  return (
    <span className={cn("iz-job-status-badge", `iz-job-status-badge--${tone}`)}>
      <span className="iz-job-status-badge-dot" aria-hidden />
      {label}
    </span>
  );
}

function JobBudgetCell({ amount }: { amount: number }) {
  const isZero = amount === 0;
  return (
    <span className={cn("iz-job-posting-budget font-semibold tabular-nums", isZero && "is-zero")}>
      {formatRM(amount)}
    </span>
  );
}

function ComposerField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("iz-job-posting-field flex w-full min-w-0 flex-col gap-1", className)}>
      <JobPostingMicroLabel>{label}</JobPostingMicroLabel>
      {children}
    </label>
  );
}

function AgencyJobComposer({
  draft,
  onChange,
  offers,
  title,
  onRemove,
  showRemove,
  onDone,
}: {
  draft: AgencyJobDraft;
  onChange: (patch: Partial<AgencyJobDraft>) => void;
  offers: AgencySpecialServiceOffer[];
  title?: string;
  onRemove?: () => void;
  showRemove?: boolean;
  onDone?: () => void;
}) {
  const offer = specialServiceOffer(draft.serviceType);

  return (
    <>
      {(title || showRemove || onDone) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {title ? <span className="text-[11px] font-semibold text-[var(--iz-muted)]">{title}</span> : <span />}
          <div className="flex items-center gap-1.5">
            {onDone && (
              <button
                type="button"
                onClick={onDone}
                className="iz-chip px-2 py-1 text-[11px] font-semibold text-[var(--iz-gold)]"
              >
                Done
              </button>
            )}
            {showRemove && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
                aria-label="Remove job"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="iz-job-posting-field-grid">
        <ComposerField label="Date">
          <div className="iz-job-posting-control">
            <JobMultiDatePicker
              embedded
              selectedDateIsos={draft.selectedDateIsos}
              onChange={(selectedDateIsos) => onChange({ selectedDateIsos })}
            />
          </div>
        </ComposerField>
        <ComposerField label="Budget (RM)">
          <input
            type="number"
            min={0}
            step={5}
            className="iz-job-posting-control iz-job-posting-input block w-full min-w-0"
            placeholder="Enter amount"
            aria-label="Budget"
            value={draft.budget}
            onChange={(e) => onChange({ budget: e.target.value })}
          />
        </ComposerField>
        <ComposerField label="Start time">
          <div className="iz-job-posting-control">
            <IzTimeInput
              value={draft.time}
              onChange={(time) => onChange({ time })}
              className="iz-job-composer-slot w-full min-w-0"
              aria-label="Start time"
            />
          </div>
        </ComposerField>
      </div>

      <ComposerField label="Service type" className="mt-3">
        <div className="iz-job-posting-type-grid">
          {offers.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ serviceType: option.id })}
              className={cn(
                "iz-job-posting-type-pill",
                draft.serviceType === option.id && "is-active",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {offer && <p className="iz-job-posting-type-summary">{offer.summary}</p>}
      </ComposerField>

      <ComposerField label="Remark" className="mt-3">
        <textarea
          className="iz-job-posting-control iz-job-posting-textarea min-h-[68px] w-full resize-none outline-none"
          placeholder={specialServiceRemarkHint(draft.serviceType)}
          value={draft.remark}
          onChange={(e) => onChange({ remark: e.target.value })}
        />
      </ComposerField>
    </>
  );
}

function AgencyJobTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="iz-job-postings-table-wrap">
      <table className="iz-data-table iz-job-postings-table">{children}</table>
    </div>
  );
}

function AgencyJobQueueTable({
  rows,
  onEdit,
  onRemove,
}: {
  rows: QueuedAgencyJob[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <AgencyJobTable>
      <JobTableHead />
      <tbody>
        {rows.map((row, index) => {
          const parsed = parseDraftAmounts(row);
          const budget = parsed?.budget ?? 0;
          const remark = row.remark.trim() || "—";

          return (
            <tr key={row.id} className={index % 2 === 1 ? "is-alt" : undefined}>
              <td className="iz-job-posting-col-date whitespace-nowrap">
                <div className="flex items-start justify-between gap-2">
                  <span>{formatJobDates(row.selectedDateIsos)}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onEdit(row.id)}
                      className="iz-chip flex h-6 w-6 items-center justify-center !p-0"
                      aria-label="Edit job"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
                      aria-label="Remove job"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </td>
              <td className="iz-job-posting-col-type whitespace-nowrap">{specialServiceTypeLabel(row.serviceType)}</td>
              <td className="text-right whitespace-nowrap">
                <JobBudgetCell amount={budget} />
              </td>
              <td className="iz-job-posting-col-time whitespace-nowrap tabular-nums">{row.time}</td>
              <td>
                <JobStatusBadge tone="queued" label="Queued" />
              </td>
              <td className="iz-job-posting-col-remark max-w-[180px]">
                <span className="line-clamp-2" title={remark}>
                  {remark}
                </span>
              </td>
              <td className="iz-job-posting-col-cost text-right whitespace-nowrap">—</td>
            </tr>
          );
        })}
      </tbody>
    </AgencyJobTable>
  );
}

function AgencyJobPostingsTable({ rows }: { rows: SpecialServiceRecord[] }) {
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const dateCmp = b.dateIso.localeCompare(a.dateIso);
        if (dateCmp !== 0) return dateCmp;
        return b.time.localeCompare(a.time);
      }),
    [rows],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        <p className="text-xs text-[var(--iz-muted)]">No job postings match this filter</p>
      </div>
    );
  }

  return (
    <AgencyJobTable>
      <JobTableHead />
      <tbody>
        {sorted.map((row, index) => (
          <tr key={row.id} className={index % 2 === 1 ? "is-alt" : undefined}>
            <td className="iz-job-posting-col-date whitespace-nowrap">{row.date}</td>
            <td className="iz-job-posting-col-type whitespace-nowrap">{specialServiceTypeLabel(row.serviceType)}</td>
            <td className="text-right whitespace-nowrap">
              <JobBudgetCell amount={row.amountIn} />
            </td>
            <td className="iz-job-posting-col-time whitespace-nowrap tabular-nums">{row.time}</td>
            <td>
              <JobStatusBadge
                tone={agencyJobPostingStatusTone(row)}
                label={agencyJobPostingInzLabel(row)}
              />
            </td>
            <td className="iz-job-posting-col-remark max-w-[180px]">
              <span className="line-clamp-2" title={row.description}>
                {row.description}
              </span>
            </td>
            <td className="iz-job-posting-col-cost text-right whitespace-nowrap font-semibold tabular-nums">
              {formatPostedJobCost(row.amountOut)}
            </td>
          </tr>
        ))}
      </tbody>
    </AgencyJobTable>
  );
}

export function SpecialServiceSection({ canBook }: { canBook: boolean }) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const records = useStore((s) => s.specialServiceOrders);
  const submitOrder = useStore((s) => s.submitSpecialServiceOrder);

  const serviceOffers = useMemo(() => bookableServiceOffers("agency"), []);
  const prOptions = useMemo(
    () => agencyPRs.filter((p) => !p.detached).map((p) => ({ id: p.id, name: p.name })),
    [agencyPRs],
  );

  const [composer, setComposer] = useState<AgencyJobDraft>(() => newAgencyJobDraft(serviceOffers));
  const [queuedJobs, setQueuedJobs] = useState<QueuedAgencyJob[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingFilters, setBookingFilters] = useState(EMPTY_SPECIAL_SERVICE_FILTERS);

  const agencyPosted = useMemo(() => agencyPostedSpecialServices(records), [records]);
  const bookingDateIsos = useMemo(() => collectSpecialServiceDateIsos(agencyPosted), [agencyPosted]);
  const filtered = useMemo(
    () => filterSpecialServiceRecords(agencyPosted, bookingFilters),
    [agencyPosted, bookingFilters],
  );

  const queuedOrderCount = useMemo(
    () => queuedJobs.reduce((sum, job) => sum + daysInDraft(job), 0),
    [queuedJobs],
  );

  const addToQueue = () => {
    if (!parseDraftAmounts(composer) || composer.selectedDateIsos.length === 0) return;
    setQueuedJobs((cur) => [...cur, newQueuedJob(composer)]);
    setComposer(newAgencyJobDraft(serviceOffers));
    setEditingId(null);
  };

  const removeFromQueue = (id: string) => {
    setQueuedJobs((cur) => cur.filter((j) => j.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (id: string) => setEditingId(id);

  const submitAll = () => {
    const pr = prOptions[0];
    if (!pr || queuedJobs.length === 0) return;

    const raisedBy = AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"];

    for (const job of queuedJobs) {
      const parsed = parseDraftAmounts(job);
      if (!parsed) continue;

      for (const dateIso of job.selectedDateIsos) {
        submitOrder({
          initiatedBy: "agency",
          raisedBy,
          prId: pr.id,
          prName: pr.name,
          outlet: DEFAULT_OUTLET,
          serviceType: job.serviceType,
          description: job.remark.trim() || parsed.offer.summary,
          amountIn: parsed.budget,
          amountOut: 0,
          time: job.time,
          dateIso,
        });
      }
    }

    setQueuedJobs([]);
    setComposer(newAgencyJobDraft(serviceOffers));
    setEditingId(null);
  };

  const canAdd = Boolean(parseDraftAmounts(composer)) && composer.selectedDateIsos.length > 0;

  return (
    <div className="iz-agency-job-posting mt-2">
      {canBook && (
        <section className="iz-job-posting-form-section">
          <div className="iz-job-posting-form-card">
            <JobPostingMicroLabel className="mb-3 block">New job</JobPostingMicroLabel>
            {editingId ? (
              <AgencyJobComposer
                draft={queuedJobs.find((j) => j.id === editingId) ?? composer}
                onChange={(patch) =>
                  setQueuedJobs((cur) => cur.map((j) => (j.id === editingId ? { ...j, ...patch } : j)))
                }
                offers={serviceOffers}
                title={`Edit job ${queuedJobs.findIndex((j) => j.id === editingId) + 1}`}
                onRemove={() => removeFromQueue(editingId)}
                showRemove
                onDone={() => setEditingId(null)}
              />
            ) : (
              <AgencyJobComposer
                draft={composer}
                onChange={(patch) => setComposer((c) => ({ ...c, ...patch }))}
                offers={serviceOffers}
              />
            )}

            {!editingId && (
              <button
                type="button"
                onClick={addToQueue}
                disabled={!canAdd}
                className="iz-btn iz-btn-soft iz-job-posting-add-btn mt-3 w-full disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                {queuedJobs.length === 0 ? "Add job" : "Add another job"}
              </button>
            )}
          </div>

          {queuedJobs.length > 0 && !editingId && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <JobPostingMicroLabel>Queued jobs</JobPostingMicroLabel>
                <span className="iz-job-posting-count-pill">
                  {queuedJobs.length} job{queuedJobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <AgencyJobQueueTable rows={queuedJobs} onEdit={startEdit} onRemove={removeFromQueue} />
            </div>
          )}

          <button
            type="button"
            onClick={submitAll}
            disabled={queuedJobs.length === 0}
            className="iz-btn iz-btn-primary iz-job-posting-submit-btn mt-3 w-full disabled:opacity-40"
          >
            Post{queuedJobs.length > 0 ? ` ${queuedOrderCount}` : ""} job
            {queuedOrderCount !== 1 ? "s" : ""} for admin review
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      )}

      <section className="iz-job-posting-list-section">
        <div className="iz-job-posting-list-head">
          <JobPostingMicroLabel>Your job postings</JobPostingMicroLabel>
          <span className="iz-job-posting-count-pill">
            {filtered.length} of {agencyPosted.length}
          </span>
        </div>

        <SpecialServiceFilters
          filters={bookingFilters}
          onChange={(patch) => setBookingFilters((prev) => ({ ...prev, ...patch }))}
          bookingDateIsos={bookingDateIsos}
          resultCount={filtered.length}
          totalCount={agencyPosted.length}
          serviceOffers={serviceOffers}
          agencyStatuses
          jobPostingLayout
        />

        <div className="mt-2.5">
          <AgencyJobPostingsTable rows={filtered} />
        </div>
      </section>
    </div>
  );
}
