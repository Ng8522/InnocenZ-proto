import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback, type ReactNode } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrOfferRow, PrOfferRowActions, PrStatusPill } from "@/components/pr/PrOfferRow";
import { PrAgencySchedulePanel } from "@/components/pr/PrAgencySchedulePanel";
import { buildPrUpcomingEvents } from "@/lib/pr-agency-schedule";
import { PrSection } from "@/components/pr/PrSection";
import { useStore } from "@/lib/store";
import {
  PR_SHIFT_OFFERS,
  fmtDFriendly,
  fmtDShort,
  getPrProfile,
  getPrRosterId,
  filterPvsForPrProfile,
  pvNeedsPrReview,
} from "@/lib/pr-demo";
import {
  findAgencyRosterTonight,
  resolvePrShiftOfferForPr,
  shiftIndexForOutlet,
} from "@/lib/pr-session";
import { DEFAULT_ROSTER_DATE_ISO, outletPendingShiftsForPr } from "@/lib/roster-availability";
import {
  PR_MARKETPLACE_LISTINGS,
  pendingSwapOffersForPr,
  swapBlocksRequestingPrShift,
  type MarketplaceListing,
} from "@/lib/pr-features";
import { SpecialServicePortalSection } from "@/components/special-service/SpecialServicePortalSection";
import { SpecialServiceOrderCard } from "@/components/special-service/SpecialServiceOrderCard";
import { pendingSpecialServicesForPr } from "@/lib/special-service-actions";
import {
  Briefcase,
  ExternalLink,
  FileText,
  Filter,
  MapPin,
  Sparkles,
  Store,
} from "lucide-react";
import { formatRM, IzCardTitle } from "@/components/iz/ui";
import { IconGuide } from "@/components/iz/IconGuide";
import { LabelWithIcon } from "@/components/iz/TitleWithIcon";
import { outletLogoForName } from "@/lib/outlet-demo";
import { publicAssetPath } from "@/lib/public-asset";

type HostHubView = "shifts" | "services";

export const Route = createFileRoute("/host/")({
  validateSearch: (search: Record<string, unknown>): { view: HostHubView } => {
    if (search.view === "services") return { view: "services" };
    return { view: "shifts" };
  },
  component: HostShifts,
});

type MktFilters = {
  area: string;
  tier: string;
  language: string;
  date: string;
  minRate: string;
  role: string;
};

type PrHubSectionKey = "today" | "todo" | "agency" | "openShifts";
const EMPTY_MKT_FILTERS: MktFilters = {
  area: "",
  tier: "",
  language: "",
  date: "",
  minRate: "",
  role: "",
};

function HostShifts() {
  const navigate = useNavigate();
  const { view } = Route.useSearch();
  const prSubRole = useStore((s) => s.prSubRole);
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const pendingApproval = useStore((s) => s.pendingApproval);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const acceptedShiftIndex = useStore((s) => s.acceptedShiftIndex);
  const declinePrOffer = useStore((s) => s.declinePrOffer);
  const applyFreelancerListing = useStore((s) => s.applyFreelancerListing);
  const prFreelancerLowRatingStrikes = useStore((s) => s.prFreelancerLowRatingStrikes);
  const acceptSwapReplacement = useStore((s) => s.acceptSwapReplacement);
  const rejectSwapReplacement = useStore((s) => s.rejectSwapReplacement);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const shifts = useStore((s) => s.shifts);
  const prDeclinedOfferIds = useStore((s) => s.prDeclinedOfferIds);
  const prMarketplaceApplication = useStore((s) => s.prMarketplaceApplication);
  const prUpcomingShifts = useStore((s) => s.prUpcomingShifts);
  const prSwapRequests = useStore((s) => s.prSwapRequests);
  const cancelPrRosterShift = useStore((s) => s.cancelPrRosterShift);
  const cancelPrUpcomingShift = useStore((s) => s.cancelPrUpcomingShift);
  const specialServiceOrders = useStore((s) => s.specialServiceOrders);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const acceptSpecialServiceByPr = useStore((s) => s.acceptSpecialServiceByPr);
  const declineSpecialServiceByPr = useStore((s) => s.declineSpecialServiceByPr);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);

  const [confirmMktId, setConfirmMktId] = useState<string | null>(null);
  const [swapRejectId, setSwapRejectId] = useState<string | null>(null);
  const [swapRejectReason, setSwapRejectReason] = useState("");
  const [mktFilters, setMktFilters] = useState<MktFilters>(EMPTY_MKT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hubSectionsOpen, setHubSectionsOpen] = useState({
    today: true,
    todo: false,
    agency: false,
    openShifts: false,
  });

  const focusHubSection = useCallback((key: PrHubSectionKey) => {
    setHubSectionsOpen((prev) => ({ ...prev, [key]: true }));
    window.requestAnimationFrame(() => {
      document.getElementById(`pr-hub-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const setHubSectionOpen = useCallback((key: PrHubSectionKey, open: boolean) => {
    setHubSectionsOpen((prev) => ({ ...prev, [key]: open }));
  }, []);

  const profile = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";
  const myRosterId = getPrRosterId(prSubRole);
  const pendingServices = useMemo(
    () => pendingSpecialServicesForPr(specialServiceOrders, myRosterId),
    [specialServiceOrders, myRosterId],
  );
  const setHubView = (next: HostHubView) => navigate({ to: "/host", search: { view: next } });
  const agencyTonight = useMemo(
    () => (tied ? findAgencyRosterTonight(agencyRoster, myRosterId) : undefined),
    [tied, agencyRoster, myRosterId],
  );
  const blockingSwap = useMemo(
    () =>
      swapBlocksRequestingPrShift(
        prSwapRequests,
        myRosterId,
        agencyTonight?.id,
        DEFAULT_ROSTER_DATE_ISO,
      ),
    [prSwapRequests, myRosterId, agencyTonight?.id],
  );
  const swapOffers = useMemo(
    () => pendingSwapOffersForPr(prSwapRequests, myRosterId),
    [prSwapRequests, myRosterId],
  );
  const outletPendingShifts = useMemo(
    () => outletPendingShiftsForPr(agencyRoster, myRosterId),
    [agencyRoster, myRosterId],
  );
  const rosterBooked =
    !!agencyTonight &&
    ["scheduled", "on-duty", "en-route", "swap-pending", "assignment-pending"].includes(
      agencyTonight.status,
    );
  const effectiveShiftAccepted = (shiftAccepted || rosterBooked) && !blockingSwap;
  const activeShift = useMemo(() => {
    if (!effectiveShiftAccepted) return null;
    if (tied) {
      return resolvePrShiftOfferForPr(agencyRoster, myRosterId, acceptedShiftIndex, shifts);
    }
    if (acceptedShiftIndex != null) {
      return PR_SHIFT_OFFERS[acceptedShiftIndex] ?? PR_SHIFT_OFFERS[0];
    }
    if (agencyTonight) {
      return PR_SHIFT_OFFERS[shiftIndexForOutlet(agencyTonight.outlet)] ?? PR_SHIFT_OFFERS[0];
    }
    return null;
  }, [
    effectiveShiftAccepted,
    tied,
    agencyRoster,
    myRosterId,
    acceptedShiftIndex,
    shifts,
    agencyTonight,
  ]);
  const firstName = (prDisplayName ?? profile.first).split(" ")[0];

  const myVouchers = useMemo(
    () => filterPvsForPrProfile(prPaymentVouchers, profile, prSubRole),
    [prPaymentVouchers, profile, prSubRole],
  );
  const todoPvs = useMemo(() => myVouchers.filter((p) => pvNeedsPrReview(p.status)), [myVouchers]);
  const todoCount =
    todoPvs.length +
    pendingServices.length +
    swapOffers.length +
    outletPendingShifts.length +
    (pendingApproval ? 1 : 0) +
    (!tied && prMarketplaceApplication?.status === "pending" ? 1 : 0);
  const todayStatus = checkedOut
    ? "Complete"
    : checkedIn
      ? "On duty"
      : effectiveShiftAccepted
        ? "Tonight"
        : agencyTonight
          ? "Scheduled"
          : "Off";

  const confirmMkt = confirmMktId
    ? PR_MARKETPLACE_LISTINGS.find((l) => l.id === confirmMktId)
    : null;

  const filteredMarketplace = useMemo(() => {
    const minRate = mktFilters.minRate ? Number(mktFilters.minRate) : 0;
    return PR_MARKETPLACE_LISTINGS.filter((l) => {
      if (prDeclinedOfferIds.includes(l.id)) return false;
      if (mktFilters.area && l.area !== mktFilters.area) return false;
      if (mktFilters.tier && String(l.tierMin) !== mktFilters.tier) return false;
      if (mktFilters.language && !l.languages.includes(mktFilters.language)) return false;
      if (mktFilters.role && l.role !== mktFilters.role) return false;
      if (mktFilters.date) {
        const key = `${l.date[0]}-${l.date[1]}-${l.date[2]}`;
        if (key !== mktFilters.date) return false;
      }
      if (minRate > 0 && l.rate < minRate) return false;
      return true;
    });
  }, [mktFilters, prDeclinedOfferIds]);

  const mktAreas = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => l.area))];
  const mktTiers = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => String(l.tierMin)))];
  const mktDates = [
    ...new Set(PR_MARKETPLACE_LISTINGS.map((l) => `${l.date[0]}-${l.date[1]}-${l.date[2]}`)),
  ];
  const mktRoles = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => l.role))];
  const mktRates = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => l.rate))].sort((a, b) => a - b);

  const upcomingEvents = useMemo(
    () => (tied ? buildPrUpcomingEvents(myRosterId, agencyRoster, prUpcomingShifts) : []),
    [tied, myRosterId, agencyRoster, prUpcomingShifts],
  );
  const offerCount = tied ? upcomingEvents.length : filteredMarketplace.length;
  const statusLabel =
    blockingSwap?.status === "pending_replacement"
      ? "Swap pending"
      : outletPendingShifts.length > 0
        ? "Action needed"
        : todoCount > 0
          ? `${todoCount} to-do`
          : effectiveShiftAccepted
            ? checkedOut
              ? "Complete"
              : checkedIn
                ? "On duty"
                : "Confirmed"
            : pendingApproval
              ? "Pending"
              : "Browsing";

  const hideOfferActions =
    effectiveShiftAccepted ||
    pendingApproval ||
    (!tied && prMarketplaceApplication?.status === "pending");

  return (
    <div className="iz-screen">
      <AppTopbar />

      <PrPageHeader
        label={
          view === "services" ? "Agency add-on services" : tied ? "Agency shifts" : "Marketplace"
        }
        title={
          view === "services" ? (
            "Job Posting"
          ) : (
            <>
              Hi, <span className="iz-pr-page-header__accent">{firstName}</span>
            </>
          )
        }
      />

      <div className="iz-pr-hub-toolbar mt-3">
        <div className="iz-pr-hub-toggle">
          <button
            type="button"
            className={view === "shifts" ? "on shifts" : ""}
            onClick={() => setHubView("shifts")}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            Shifts
          </button>
          <button
            type="button"
            className={view === "services" ? "on services" : ""}
            onClick={() => setHubView("services")}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Job postings
            {pendingServices.length > 0 && (
              <span className="iz-pr-hub-toggle__badge">{pendingServices.length}</span>
            )}
          </button>
        </div>
      </div>

      {view === "services" ? (
        <div className="mt-3">
          <SpecialServicePortalSection role="pr" />
        </div>
      ) : (
        <>
          <PrHomeHubStrip
            tied={tied}
            hubSectionsOpen={hubSectionsOpen}
            focusHubSection={focusHubSection}
            todayStatus={todayStatus}
            todoCount={todoCount}
            upcomingCount={upcomingEvents.length}
            offerCount={offerCount}
            prUpcomingCount={prUpcomingShifts.length}
            statusLabel={statusLabel}
            openShiftCount={filteredMarketplace.length}
          />

          {!effectiveShiftAccepted &&
            !pendingApproval &&
            (!tied || !rosterBooked) &&
            prMarketplaceApplication?.status !== "pending" && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="iz-btn iz-btn-soft iz-btn-sm !py-1.5"
                  onClick={() => {
                    demoPrShiftIn();
                    void navigate({ to: "/host/tonight" });
                  }}
                >
                  Demo shift in
                </button>
              </div>
            )}

          <div className="iz-pr-hub-sections">
            <PrSection
              id="pr-hub-today"
              title="Today"
              collapsible
              open={hubSectionsOpen.today}
              onOpenChange={(open) => setHubSectionOpen("today", open)}
            >
              {effectiveShiftAccepted && activeShift ? (
                <TodayShiftCard
                  eyebrow={checkedOut ? "Complete" : checkedIn ? "On duty" : "Tonight"}
                  outlet={activeShift.outlet}
                  date={fmtDFriendly(activeShift.date[0], activeShift.date[1], activeShift.date[2])}
                  time={activeShift.time}
                  footnote={`${activeShift.event} · ${formatRM(activeShift.base + activeShift.comm)}`}
                  badge={
                    checkedOut ? (
                      <PrStatusPill variant="green">Checked out</PrStatusPill>
                    ) : undefined
                  }
                >
                  <Link
                    to="/host/tonight"
                    className={`iz-btn iz-btn-sm iz-pr-shift-card__cta w-full${checkedOut ? " iz-btn-soft" : " iz-btn-primary"}`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {checkedOut ? "View summary" : checkedIn ? "Attendance" : "Check in"}
                  </Link>
                </TodayShiftCard>
              ) : agencyTonight ? (
                <TodayShiftCard
                  eyebrow="Tonight"
                  outlet={agencyTonight.outlet}
                  date={agencyTonight.date}
                  time={agencyTonight.shift}
                  badge={
                    <PrStatusPill
                      variant={
                        ["scheduled", "on-duty", "en-route"].includes(agencyTonight.status)
                          ? "green"
                          : "amber"
                      }
                    >
                      {["scheduled", "on-duty", "en-route"].includes(agencyTonight.status)
                        ? "Scheduled"
                        : "Pending"}
                    </PrStatusPill>
                  }
                />
              ) : (
                <p className="iz-tiny iz-muted2 rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
                  No shift scheduled for today.
                </p>
              )}
            </PrSection>

            <PrSection
              id="pr-hub-todo"
              title="To-do"
              collapsible
              open={hubSectionsOpen.todo}
              onOpenChange={(open) => setHubSectionOpen("todo", open)}
            >
              {todoCount === 0 ? (
                <p className="iz-tiny iz-muted2 rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
                  Nothing to do
                </p>
              ) : (
                <div className="iz-pr-list">
                  {todoPvs.map((pv) => (
                    <TodoActionCard
                      key={pv.id}
                      icon={<FileText className="h-4 w-4" />}
                      title="Review payment voucher"
                      subtitle={`${pv.outlet} · ${pv.cycle} · ${formatRM(pv.net)}`}
                      actionLabel="Review PV"
                      to="/host/PaymentVoucher"
                      search={{ pvId: pv.id }}
                    />
                  ))}
                  {pendingServices.map((row) => (
                    <div key={row.id} className="iz-pr-todo-service">
                      <SpecialServiceOrderCard
                        row={row}
                        role="pr"
                        onAccept={acceptSpecialServiceByPr}
                        onDecline={declineSpecialServiceByPr}
                      />
                    </div>
                  ))}
                  {swapOffers.map((offer) => (
                    <InboxCard
                      key={offer.id}
                      title={offer.outlet}
                      subtitle={`Cover for ${offer.requestingPrName} · ${offer.date} · ${offer.shift}`}
                      onApprove={() => acceptSwapReplacement(offer.id)}
                      onReject={() => {
                        setSwapRejectId(offer.id);
                        setSwapRejectReason("");
                      }}
                    />
                  ))}
                  {outletPendingShifts.map((slot) => (
                    <div key={slot.id} className="iz-pr-inbox-card border-[rgba(244,183,64,.35)]">
                      <PrOfferRow
                        title={slot.outlet}
                        subtitle={`${slot.date} · ${slot.shift} · Agency assigned — awaiting outlet roster sync`}
                        badge={<PrStatusPill variant="amber">Outlet pending</PrStatusPill>}
                      />
                    </div>
                  ))}
                  {pendingApproval && (
                    <div className="iz-pr-inbox-card border-[rgba(244,183,64,.35)]">
                      <PrOfferRow
                        title="Agency assignment"
                        subtitle="Your agency is finalizing this shift — no action needed from you"
                        badge={<PrStatusPill variant="amber">Pending</PrStatusPill>}
                      />
                    </div>
                  )}
                  {!tied && prMarketplaceApplication?.status === "pending" && (
                    <div className="iz-pr-inbox-card border-[rgba(244,183,64,.35)]">
                      <PrOfferRow
                        title="Marketplace application"
                        subtitle="Pending"
                        badge={<PrStatusPill variant="amber">Pending</PrStatusPill>}
                      />
                    </div>
                  )}
                </div>
              )}
            </PrSection>

            {!tied && prFreelancerLowRatingStrikes >= 3 && (
              <p className="iz-pr-note mt-3 border-[rgba(255,107,107,.35)] text-[var(--iz-red)]">
                Marketplace suspended — 3 ratings below 3.0★. See Profile for details.
              </p>
            )}

            {tied && (
              <PrSection
                id="pr-hub-agency"
                title="Agency schedule"
                collapsible
                open={hubSectionsOpen.agency}
                onOpenChange={(open) => setHubSectionOpen("agency", open)}
              >
                <PrAgencySchedulePanel
                  prId={myRosterId}
                  roster={agencyRoster}
                  upcoming={prUpcomingShifts}
                  onCancelShift={(entry, reason) => {
                    if (entry.slot) {
                      cancelPrRosterShift(entry.slot.id, reason);
                    } else if (entry.upcoming) {
                      cancelPrUpcomingShift(entry.upcoming.id, reason);
                    }
                  }}
                />
              </PrSection>
            )}

            {!tied && (
              <PrSection
                id="pr-hub-openShifts"
                title="Open shifts"
                collapsible
                open={hubSectionsOpen.openShifts}
                onOpenChange={(open) => setHubSectionOpen("openShifts", open)}
                trailing={
                  <button
                    type="button"
                    className="iz-outlet-quick-chip !py-1"
                    onClick={() => setFiltersOpen(true)}
                  >
                    <Filter className="h-3 w-3" /> Filter
                  </button>
                }
              >
                <div className="iz-pr-list">
                  {filteredMarketplace.map((l) => (
                    <div key={l.id} className="iz-pr-inbox-card">
                      <PrOfferRow
                        title={l.outlet}
                        subtitle={`${fmtDFriendly(l.date[0], l.date[1], l.date[2])} · ${l.time} · ${l.area}`}
                        amount={formatRM(l.rate)}
                        onClick={hideOfferActions ? undefined : () => setConfirmMktId(l.id)}
                      />
                      {!hideOfferActions && (
                        <PrOfferRowActions
                          primaryLabel="Apply"
                          onPrimary={() => setConfirmMktId(l.id)}
                          onSecondary={() => declinePrOffer(l.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </PrSection>
            )}
          </div>
        </>
      )}

      <IzSheet open={confirmMkt !== null} onClose={() => setConfirmMktId(null)}>
        {confirmMkt && (
          <OfferDetailSheet
            listing={confirmMkt}
            onConfirm={() => {
              if (applyFreelancerListing(confirmMkt.id)) setConfirmMktId(null);
            }}
            onDecline={() => {
              declinePrOffer(confirmMkt.id);
              setConfirmMktId(null);
            }}
          />
        )}
      </IzSheet>

      <IzSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <IzCardTitle>Filters</IzCardTitle>
        <FilterSelect
          label="Area"
          value={mktFilters.area}
          onChange={(v) => setMktFilters((f) => ({ ...f, area: v }))}
        >
          <option value="">All</option>
          {mktAreas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Min tier"
          value={mktFilters.tier}
          onChange={(v) => setMktFilters((f) => ({ ...f, tier: v }))}
        >
          <option value="">Any</option>
          {mktTiers.map((t) => (
            <option key={t} value={t}>
              Tier {t}+
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Language"
          value={mktFilters.language}
          onChange={(v) => setMktFilters((f) => ({ ...f, language: v }))}
        >
          <option value="">Any</option>
          {["English", "Mandarin", "Cantonese"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Date"
          value={mktFilters.date}
          onChange={(v) => setMktFilters((f) => ({ ...f, date: v }))}
        >
          <option value="">Any</option>
          {mktDates.map((d) => {
            const [y, m, day] = d.split("-").map(Number);
            return (
              <option key={d} value={d}>
                {fmtDShort(y, m, day)}
              </option>
            );
          })}
        </FilterSelect>
        <FilterSelect
          label="Min rate (RM)"
          value={mktFilters.minRate}
          onChange={(v) => setMktFilters((f) => ({ ...f, minRate: v }))}
        >
          <option value="">Any</option>
          {mktRates.map((r) => (
            <option key={r} value={String(r)}>
              {formatRM(r)}+
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Role"
          value={mktFilters.role}
          onChange={(v) => setMktFilters((f) => ({ ...f, role: v }))}
        >
          <option value="">Any</option>
          {mktRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </FilterSelect>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => setMktFilters(EMPTY_MKT_FILTERS)}
        >
          Clear filters
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-3"
          onClick={() => setFiltersOpen(false)}
        >
          Done
        </button>
      </IzSheet>

      <IzSheet
        open={swapRejectId !== null}
        onClose={() => {
          setSwapRejectId(null);
          setSwapRejectReason("");
        }}
      >
        <IzCardTitle>Decline coverage</IzCardTitle>
        <p className="iz-tiny iz-muted mb-3">
          Tell the agency why you cannot take this shift — they will find someone else.
        </p>
        <textarea
          className="iz-pv-dispute-input mb-3"
          rows={3}
          placeholder="Reason (required)"
          value={swapRejectReason}
          onChange={(e) => setSwapRejectReason(e.target.value)}
        />
        <button
          type="button"
          className="iz-btn iz-btn-primary w-full"
          disabled={!swapRejectReason.trim() || !swapRejectId}
          onClick={() => {
            if (!swapRejectId) return;
            rejectSwapReplacement(swapRejectId, swapRejectReason);
            setSwapRejectId(null);
            setSwapRejectReason("");
          }}
        >
          Submit decline
        </button>
      </IzSheet>

      <IconGuide className="mt-4 mb-2" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <>
      <label className="iz-tiny iz-muted2">{label}</label>
      <select
        className="iz-field-input mb-3 mt-1 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </>
  );
}

function PrHomeHubStrip({
  tied,
  hubSectionsOpen,
  focusHubSection,
  todayStatus,
  todoCount,
  upcomingCount,
  offerCount,
  prUpcomingCount,
  statusLabel,
  openShiftCount,
}: {
  tied: boolean;
  hubSectionsOpen: Record<PrHubSectionKey, boolean>;
  focusHubSection: (key: PrHubSectionKey) => void;
  todayStatus: string;
  todoCount: number;
  upcomingCount: number;
  offerCount: number;
  prUpcomingCount: number;
  statusLabel: string;
  openShiftCount: number;
}) {
  const tabs = tied
    ? ([
        {
          key: "today" as const,
          label: "Today",
          value: todayStatus,
          accent: "text-[var(--iz-gold-l)]",
        },
        {
          key: "todo" as const,
          label: "To-do",
          value: String(todoCount),
          accent: todoCount > 0 ? "text-[var(--iz-amber)]" : "",
        },
        {
          key: "agency" as const,
          label: "Upcoming",
          value: String(upcomingCount),
          accent: "",
        },
      ] as const)
    : ([
        {
          key: "openShifts" as const,
          label: "Offers",
          value: String(offerCount),
          accent: "",
        },
        {
          key: "openShifts" as const,
          label: "Upcoming",
          value: String(prUpcomingCount),
          accent: "",
        },
        {
          key: "today" as const,
          label: "Status",
          value: statusLabel,
          accent: "text-[var(--iz-gold-l)]",
        },
        {
          key: "openShifts" as const,
          label: "Open",
          value: String(openShiftCount),
          accent: "",
        },
      ] as const);

  return (
    <div
      className="iz-agency-home-tabs iz-pr-home-tabs mt-3"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab, index) => (
        <button
          key={`${tab.key}-${tab.label}-${index}`}
          type="button"
          className={`iz-agency-home-tab${hubSectionsOpen[tab.key] ? " on" : ""}`}
          onClick={() => focusHubSection(tab.key)}
        >
          <div className="l">{tab.label}</div>
          <div className={`n truncate ${tab.accent}`.trim()}>{tab.value}</div>
        </button>
      ))}
    </div>
  );
}

function TodayShiftCard({
  eyebrow,
  outlet,
  date,
  time,
  footnote,
  badge,
  children,
}: {
  eyebrow: string;
  outlet: string;
  date: string;
  time: string;
  footnote?: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const logo = outletLogoForName(outlet);
  const outletInitial = outlet.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="iz-pr-shift-card">
      <div className="iz-pr-shift-card__head">
        <div className="iz-pr-shift-card__eyebrow-row">
          <p className="iz-pr-shift-card__eyebrow">{eyebrow}</p>
          {badge}
        </div>
        <div className="iz-pr-shift-card__venue">
          <div className="iz-avatar iz-avatar--md iz-pr-shift-card__logo">
            {logo ? (
              <img
                src={publicAssetPath(logo)}
                alt=""
                className="iz-avatar-photo iz-avatar-photo--logo"
              />
            ) : (
              <span>{outletInitial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <LabelWithIcon label="Outlet name" className="iz-pr-shift-card__fact-k" />
            <p className="iz-pr-shift-card__venue-name">{outlet}</p>
          </div>
        </div>
      </div>
      <dl className="iz-pr-shift-card__facts">
        <div className="iz-pr-shift-card__fact">
          <dt>
            <LabelWithIcon label="Date" className="iz-pr-shift-card__fact-k" />
          </dt>
          <dd className="iz-pr-shift-card__fact-v">{date}</dd>
        </div>
        <div className="iz-pr-shift-card__fact">
          <dt>
            <LabelWithIcon label="Time" className="iz-pr-shift-card__fact-k" />
          </dt>
          <dd className="iz-pr-shift-card__fact-v">{time}</dd>
        </div>
      </dl>
      {footnote && <p className="iz-pr-shift-card__event">{footnote}</p>}
      {children}
    </div>
  );
}

function TodoActionCard({
  icon,
  title,
  subtitle,
  actionLabel,
  to,
  search,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  to: string;
  search?: Record<string, string>;
}) {
  return (
    <div className="iz-pr-todo-card">
      <div className="iz-pr-todo-card__icon">{icon}</div>
      <div className="iz-pr-todo-card__body">
        <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">{title}</p>
        <p className="iz-tiny iz-muted mt-0.5">{subtitle}</p>
      </div>
      <Link to={to} search={search} className="iz-btn iz-btn-primary iz-btn-sm shrink-0">
        {actionLabel}
      </Link>
    </div>
  );
}

function InboxCard({
  title,
  subtitle,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="iz-pr-inbox-card">
      <PrOfferRow title={title} subtitle={subtitle} />
      <PrOfferRowActions
        primaryLabel="Accept"
        onPrimary={onApprove}
        onSecondary={onReject}
        secondaryLabel="Reject"
      />
    </div>
  );
}

function OfferDetailSheet({
  listing,
  onConfirm,
  onDecline,
}: {
  listing: MarketplaceListing;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const lat = listing.lat ?? 3.1478;
  const lng = listing.lng ?? 101.7005;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const briefing = listing.briefing ?? "";

  return (
    <>
      <IzCardTitle icon={Store}>{listing.outlet}</IzCardTitle>
      <p className="iz-tiny iz-muted mb-1">
        {fmtDFriendly(listing.date[0], listing.date[1], listing.date[2])} · {listing.time}
      </p>
      <p className="iz-tiny iz-muted mb-3">{listing.event}</p>
      <div className="iz-gps-map mb-2" style={{ height: 64 }}>
        <span className="iz-ping" style={{ left: "50%", top: "50%" }} />
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="iz-tiny mb-3 inline-flex items-center gap-1 text-[var(--iz-blue)]"
      >
        <ExternalLink className="h-3 w-3" /> Maps
      </a>
      <p className="iz-tiny iz-muted mb-3 line-clamp-3">{briefing}</p>
      <div className="iz-between iz-tiny mb-4">
        <span className="iz-muted">{listing.addr}</span>
        <span className="font-sora font-bold text-[var(--iz-gold)]">{formatRM(listing.rate)}</span>
      </div>
      {listing.tierSlots && (
        <div className="mb-4 space-y-1">
          {listing.tierSlots.map((s) => (
            <p key={s.tier} className="iz-tiny iz-muted2">
              {s.tier} ×{s.count} · {s.hours}
            </p>
          ))}
        </div>
      )}
      <div className="iz-grid2">
        <button type="button" className="iz-btn iz-btn-soft" onClick={onDecline}>
          Decline
        </button>
        <button type="button" className="iz-btn iz-btn-primary" onClick={onConfirm}>
          Apply
        </button>
      </div>
    </>
  );
}
