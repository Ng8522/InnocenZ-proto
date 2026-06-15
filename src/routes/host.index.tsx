import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrOfferRow, PrOfferRowActions, PrStatusPill } from "@/components/pr/PrOfferRow";
import { PrSection } from "@/components/pr/PrSection";
import { useStore } from "@/lib/store";
import { PR_SHIFT_OFFERS, SHIFT_TODAY, fmtDFriendly, fmtDShort, getPrProfile, getPrRosterId } from "@/lib/pr-demo";
import { findAgencyRosterTonight, shiftIndexForOutlet } from "@/lib/pr-session";
import { DEFAULT_ROSTER_DATE_ISO, isDemoDateOnOrAfter, outletPendingShiftsForPr } from "@/lib/roster-availability";
import {
  PR_AGENCY_TIED_OFFERS,
  PR_MARKETPLACE_LISTINGS,
  pendingSwapOffersForPr,
  swapBlocksRequestingPrShift,
  swapTargetOptionsForPr,
  tiedOfferToShiftIndex,
  type AgencyTiedOffer,
  type MarketplaceListing,
} from "@/lib/pr-features";
import { ArrowLeftRight, ExternalLink, Filter, MapPin } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/host/")({
  component: HostShifts,
});

type MktFilters = { area: string; tier: string; language: string; date: string; minRate: string; role: string };
const EMPTY_MKT_FILTERS: MktFilters = { area: "", tier: "", language: "", date: "", minRate: "", role: "" };

function HostShifts() {
  const navigate = useNavigate();
  const prSubRole = useStore((s) => s.prSubRole);
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const pendingApproval = useStore((s) => s.pendingApproval);
  const checkedIn = useStore((s) => s.checkedIn);
  const acceptedShiftIndex = useStore((s) => s.acceptedShiftIndex);
  const acceptPrShift = useStore((s) => s.acceptPrShift);
  const approvePrShift = useStore((s) => s.approvePrShift);
  const declinePrOffer = useStore((s) => s.declinePrOffer);
  const applyFreelancerListing = useStore((s) => s.applyFreelancerListing);
  const prFreelancerLowRatingStrikes = useStore((s) => s.prFreelancerLowRatingStrikes);
  const requestPrSwap = useStore((s) => s.requestPrSwap);
  const acceptSwapReplacement = useStore((s) => s.acceptSwapReplacement);
  const rejectSwapReplacement = useStore((s) => s.rejectSwapReplacement);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const prDeclinedOfferIds = useStore((s) => s.prDeclinedOfferIds);
  const prMarketplaceApplication = useStore((s) => s.prMarketplaceApplication);
  const prUpcomingShifts = useStore((s) => s.prUpcomingShifts);
  const prSwapRequests = useStore((s) => s.prSwapRequests);
  const approveOutletSwapByPr = useStore((s) => s.approveOutletSwapByPr);
  const declineOutletSwapByPr = useStore((s) => s.declineOutletSwapByPr);
  const approveAgencyAssignmentByPr = useStore((s) => s.approveAgencyAssignmentByPr);
  const confirmOutletRosterSlot = useStore((s) => s.confirmOutletRosterSlot);
  const declineAgencyAssignmentByPr = useStore((s) => s.declineAgencyAssignmentByPr);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);

  const [confirmTiedId, setConfirmTiedId] = useState<string | null>(null);
  const [confirmMktId, setConfirmMktId] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [swapRejectId, setSwapRejectId] = useState<string | null>(null);
  const [swapRejectReason, setSwapRejectReason] = useState("");
  const [mktFilters, setMktFilters] = useState<MktFilters>(EMPTY_MKT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const profile = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";
  const myRosterId = getPrRosterId(prSubRole);
  const todayLine = fmtDFriendly(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2]);
  const agencyTonight = useMemo(
    () => (tied ? findAgencyRosterTonight(agencyRoster, myRosterId) : undefined),
    [tied, agencyRoster, myRosterId],
  );
  const blockingSwap = useMemo(
    () => swapBlocksRequestingPrShift(prSwapRequests, myRosterId, agencyTonight?.id, DEFAULT_ROSTER_DATE_ISO),
    [prSwapRequests, myRosterId, agencyTonight?.id],
  );
  const swapOffers = useMemo(
    () => pendingSwapOffersForPr(prSwapRequests, myRosterId),
    [prSwapRequests, myRosterId],
  );
  const mySwapRequests = useMemo(
    () => prSwapRequests.filter((s) => s.requestingPrId === myRosterId),
    [prSwapRequests, myRosterId],
  );
  const rosterBooked =
    !!agencyTonight && agencyTonight.status !== "assignment-pending";
  const effectiveShiftAccepted = (shiftAccepted || rosterBooked) && !blockingSwap;
  const activeShift = useMemo(() => {
    if (!effectiveShiftAccepted) return null;
    if (acceptedShiftIndex != null) {
      return PR_SHIFT_OFFERS[acceptedShiftIndex] ?? PR_SHIFT_OFFERS[0];
    }
    if (agencyTonight) {
      return PR_SHIFT_OFFERS[shiftIndexForOutlet(agencyTonight.outlet)] ?? PR_SHIFT_OFFERS[0];
    }
    return null;
  }, [effectiveShiftAccepted, acceptedShiftIndex, agencyTonight]);
  const firstName = (prDisplayName ?? profile.first).split(" ")[0];

  const pendingOutletSwaps = agencyRoster.filter(
    (s) =>
      s.prId === myRosterId &&
      s.outletSwap?.status === "pending_pr" &&
      isDemoDateOnOrAfter(s.dateIso),
  );
  const pendingAgencyAssignments = agencyRoster.filter(
    (s) => s.prId === myRosterId && s.status === "assignment-pending" && isDemoDateOnOrAfter(s.dateIso),
  );
  const outletPendingShifts = useMemo(
    () => outletPendingShiftsForPr(agencyRoster, myRosterId),
    [agencyRoster, myRosterId],
  );
  const swapTargets = useMemo(
    () =>
      swapTargetOptionsForPr(
        agencyRoster,
        myRosterId,
        agencyTonight,
        PR_AGENCY_TIED_OFFERS,
        prDeclinedOfferIds,
      ),
    [agencyRoster, myRosterId, agencyTonight, prDeclinedOfferIds],
  );
  const hasPendingSwapOnSource =
    !!agencyTonight &&
    prSwapRequests.some(
      (s) =>
        s.requestingPrId === myRosterId &&
        s.rosterSlotId === agencyTonight.id &&
        (s.status === "pending_agency" || s.status === "pending_replacement"),
    );
  const canRequestSwap =
    tied &&
    !checkedIn &&
    !blockingSwap &&
    !!agencyTonight &&
    !hasPendingSwapOnSource &&
    swapTargets.length > 0;
  const inboxCount =
    pendingAgencyAssignments.length + pendingOutletSwaps.length + swapOffers.length;

  const tiedOffers = PR_AGENCY_TIED_OFFERS.filter((o) => !prDeclinedOfferIds.includes(o.id));
  const confirmTied = confirmTiedId ? tiedOffers.find((o) => o.id === confirmTiedId) : null;
  const confirmMkt = confirmMktId ? PR_MARKETPLACE_LISTINGS.find((l) => l.id === confirmMktId) : null;

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
  const mktDates = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => `${l.date[0]}-${l.date[1]}-${l.date[2]}`))];
  const mktRoles = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => l.role))];
  const mktRates = [...new Set(PR_MARKETPLACE_LISTINGS.map((l) => l.rate))].sort((a, b) => a - b);

  const offerCount = tied ? tiedOffers.length : filteredMarketplace.length;
  const statusLabel = blockingSwap?.status === "pending_replacement"
    ? "Swap pending"
    : outletPendingShifts.length > 0
      ? "Outlet pending"
      : effectiveShiftAccepted
      ? checkedIn
        ? "On duty"
        : "Confirmed"
      : pendingApproval
        ? "Pending"
        : "Browsing";

  const submitSwap = () => {
    if (!swapTargetId) return;
    requestPrSwap(swapTargetId, swapReason);
    setSwapOpen(false);
    setSwapTargetId(null);
    setSwapReason("");
  };

  const openSwapSheet = () => {
    setSwapTargetId(swapTargets[0]?.id ?? null);
    setSwapReason("");
    setSwapOpen(true);
  };

  const hideOfferActions =
    effectiveShiftAccepted ||
    pendingApproval ||
    (!tied && prMarketplaceApplication?.status === "pending");

  return (
    <div className="iz-screen">
      <AppTopbar />

      <PrPageHeader
        label={tied ? "Agency shifts" : "Marketplace"}
        title={`Hi, ${firstName}`}
        meta={todayLine}
      />

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Offers</div>
          <div className="n">{offerCount}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Upcoming</div>
          <div className="n">{prUpcomingShifts.length}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Status</div>
          <div className="n text-[var(--iz-gold-l)]">{statusLabel}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Inbox</div>
          <div className="n">{inboxCount}</div>
        </div>
      </div>

      {!tied && !prPayrollAgencyId && (
        <p className="iz-pr-note mt-3">Link payroll on Profile before PVs unlock.</p>
      )}

      {!effectiveShiftAccepted && !pendingApproval && (!tied || !rosterBooked) && prMarketplaceApplication?.status !== "pending" && (
        <div className="iz-pr-note mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="iz-tiny iz-muted">Skip to on-duty flow</span>
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

      {blockingSwap?.status === "pending_replacement" && (
        <div className="iz-pr-note mt-4 border-[rgba(244,183,64,.35)]">
          <span className="text-[var(--iz-amber)]">
            Swap in progress — awaiting {blockingSwap.replacementPrName} to confirm coverage for {blockingSwap.outlet}
          </span>
        </div>
      )}

      {outletPendingShifts.length > 0 && (
        <PrSection title="Awaiting outlet" hint="Swap approved — outlet must confirm" collapsible defaultOpen>
          <div className="iz-pr-list">
            {outletPendingShifts.map((slot) => (
              <div key={slot.id} className="iz-pr-inbox-card border-[rgba(244,183,64,.35)]">
                <PrOfferRow
                  title={slot.outlet}
                  subtitle={`${slot.date} · ${slot.shift}`}
                  badge={<PrStatusPill variant="amber">Outlet pending</PrStatusPill>}
                />
                <p className="iz-tiny iz-muted mt-2 px-1">
                  {slot.agencyAssignment?.agencyNote ??
                    "Agency approved your swap — the outlet reviews before you can check in."}
                </p>
                <button
                  type="button"
                  className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-full"
                  onClick={() => confirmOutletRosterSlot(slot.id)}
                >
                  Simulate outlet confirm
                </button>
              </div>
            ))}
          </div>
        </PrSection>
      )}

      {effectiveShiftAccepted && activeShift && (
        <div className="iz-pr-hero mt-4">
          <p className="iz-tiny iz-muted2 uppercase tracking-wide">{checkedIn ? "On duty" : "Tonight"}</p>
          <p className="font-sora mt-1 text-[16px] font-extrabold">{activeShift.outlet}</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {fmtDFriendly(activeShift.date[0], activeShift.date[1], activeShift.date[2])} · {activeShift.time} ·{" "}
            {formatRM(activeShift.base + activeShift.comm)}
          </p>
          <Link to="/host/tonight" className="iz-btn iz-btn-primary iz-btn-sm mt-3 w-full">
            <MapPin className="h-3.5 w-3.5" />
            {checkedIn ? "Attendance" : "Check in"}
          </Link>
          {canRequestSwap && (
            <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full" onClick={openSwapSheet}>
              <ArrowLeftRight className="h-3.5 w-3.5" /> Request swap
            </button>
          )}
        </div>
      )}

      {(pendingApproval || (!tied && prMarketplaceApplication?.status === "pending")) && (
        <div className="iz-pr-note mt-4 flex flex-wrap items-center justify-between gap-2 border-[rgba(244,183,64,.35)]">
          <span className="text-[var(--iz-amber)]">
            {pendingApproval
              ? "Awaiting agency approval"
              : "Application pending — outlet reviews on Bookings → Applicants"}
          </span>
          {pendingApproval && (
            <button
              type="button"
              className="iz-btn iz-btn-soft iz-btn-sm !py-1.5"
              onClick={approvePrShift}
            >
              Simulate agency accept
            </button>
          )}
        </div>
      )}

      {!tied && prFreelancerLowRatingStrikes >= 3 && (
        <p className="iz-pr-note mt-3 border-[rgba(255,107,107,.35)] text-[var(--iz-red)]">
          Marketplace suspended — 3 ratings below 3.0★. See Profile for details.
        </p>
      )}

      {swapOffers.length > 0 && !tied && (
        <PrSection title="Coverage offers" hint={`${swapOffers.length} need your response`} collapsible defaultOpen>
          <div className="iz-pr-list">
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
          </div>
        </PrSection>
      )}

      {tied && inboxCount > 0 && (
        <PrSection title="Agency inbox" hint={`${inboxCount} need your response`} collapsible defaultOpen>
          <div className="iz-pr-list">
            {pendingAgencyAssignments.map((slot) => (
              <InboxCard
                key={slot.id}
                title={slot.outlet}
                subtitle={`${slot.date} · ${slot.shiftStart}–${slot.shiftEnd}`}
                onApprove={() => approveAgencyAssignmentByPr(slot.id)}
                onReject={() => declineAgencyAssignmentByPr(slot.id)}
              />
            ))}
            {pendingOutletSwaps.map((slot) => (
              <InboxCard
                key={slot.id}
                title={`${slot.outlet} → ${slot.outletSwap!.targetOutlet}`}
                subtitle={`${slot.date} · Outlet swap · ${slot.shift}`}
                onApprove={() => approveOutletSwapByPr(slot.id)}
                onReject={() => declineOutletSwapByPr(slot.id)}
              />
            ))}
          </div>
        </PrSection>
      )}

      {prUpcomingShifts.length > 0 && (
        <PrSection title="Upcoming" hint="Confirmed & pending" collapsible defaultOpen={false}>
          <div className="iz-pr-list">
            {prUpcomingShifts.map((u) => (
              <PrOfferRow
                key={u.id}
                title={u.outlet}
                subtitle={`${fmtDFriendly(u.date[0], u.date[1], u.date[2])} · ${u.time}`}
                badge={<PrStatusPill variant={u.status === "confirmed" ? "green" : "amber"}>{u.status}</PrStatusPill>}
              />
            ))}
          </div>
        </PrSection>
      )}

      {mySwapRequests.length > 0 && tied && (
        <PrSection title="Swap requests" collapsible defaultOpen={false}>
          <div className="iz-pr-list">
            {mySwapRequests.slice(0, 3).map((s) => (
              <PrOfferRow
                key={s.id}
                title={s.outlet}
                subtitle={
                  s.status === "approved" && s.targetOutlet
                    ? `${s.outlet} → ${s.targetOutlet} · awaiting outlet approval`
                    : s.status === "pending_replacement" && s.replacementPrName
                    ? `${s.outlet} → ${s.targetOutlet} · awaiting ${s.replacementPrName}`
                    : s.targetOutlet
                      ? `${s.outlet} → ${s.targetOutlet} · ${s.status.replaceAll("_", " ")}`
                      : `${s.date} · ${s.shift} · ${s.status.replaceAll("_", " ")}`
                }
                badge={<PrStatusPill>{s.status.replaceAll("_", " ")}</PrStatusPill>}
              />
            ))}
          </div>
        </PrSection>
      )}

      <PrSection
        title={tied ? "Atlas Agency offers" : "Open shifts"}
        hint={tied ? "Tap to view & request" : "Apply — outlet confirms"}
        trailing={
          !tied ? (
            <button type="button" className="iz-outlet-quick-chip !py-1" onClick={() => setFiltersOpen(true)}>
              <Filter className="h-3 w-3" /> Filter
            </button>
          ) : undefined
        }
      >
        <div className="iz-pr-list">
          {tied
            ? tiedOffers.map((o) => (
                <div key={o.id} className="iz-pr-inbox-card">
                  <PrOfferRow
                    title={o.outlet}
                    subtitle={`${fmtDFriendly(o.date[0], o.date[1], o.date[2])} · ${o.time} · ${o.distance}`}
                    amount={formatRM(o.base + o.comm)}
                    onClick={hideOfferActions ? undefined : () => setConfirmTiedId(o.id)}
                  />
                  {!hideOfferActions && (
                    <PrOfferRowActions
                      primaryLabel="View"
                      onPrimary={() => setConfirmTiedId(o.id)}
                      onSecondary={() => declinePrOffer(o.id)}
                    />
                  )}
                </div>
              ))
            : filteredMarketplace.map((l) => (
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

      <IzSheet open={confirmTied !== null} onClose={() => setConfirmTiedId(null)}>
        {confirmTied && (
          <OfferDetailSheet
            tied
            offer={confirmTied}
            onConfirm={() => {
              acceptPrShift(tiedOfferToShiftIndex(confirmTied.id));
              setConfirmTiedId(null);
            }}
            onDecline={() => {
              declinePrOffer(confirmTied.id);
              setConfirmTiedId(null);
            }}
          />
        )}
      </IzSheet>

      <IzSheet open={confirmMkt !== null} onClose={() => setConfirmMktId(null)}>
        {confirmMkt && (
          <OfferDetailSheet
            tied={false}
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
        <div className="iz-cardttl">Filters</div>
        <FilterSelect label="Area" value={mktFilters.area} onChange={(v) => setMktFilters((f) => ({ ...f, area: v }))}>
          <option value="">All</option>
          {mktAreas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Min tier" value={mktFilters.tier} onChange={(v) => setMktFilters((f) => ({ ...f, tier: v }))}>
          <option value="">Any</option>
          {mktTiers.map((t) => (
            <option key={t} value={t}>Tier {t}+</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Language" value={mktFilters.language} onChange={(v) => setMktFilters((f) => ({ ...f, language: v }))}>
          <option value="">Any</option>
          {["English", "Mandarin", "Cantonese"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Date" value={mktFilters.date} onChange={(v) => setMktFilters((f) => ({ ...f, date: v }))}>
          <option value="">Any</option>
          {mktDates.map((d) => {
            const [y, m, day] = d.split("-").map(Number);
            return (
              <option key={d} value={d}>{fmtDShort(y, m, day)}</option>
            );
          })}
        </FilterSelect>
        <FilterSelect label="Min rate (RM)" value={mktFilters.minRate} onChange={(v) => setMktFilters((f) => ({ ...f, minRate: v }))}>
          <option value="">Any</option>
          {mktRates.map((r) => (
            <option key={r} value={String(r)}>{formatRM(r)}+</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Role" value={mktFilters.role} onChange={(v) => setMktFilters((f) => ({ ...f, role: v }))}>
          <option value="">Any</option>
          {mktRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </FilterSelect>
        <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={() => setMktFilters(EMPTY_MKT_FILTERS)}>
          Clear filters
        </button>
        <button type="button" className="iz-btn iz-btn-primary mt-3" onClick={() => setFiltersOpen(false)}>
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
        <div className="iz-cardttl">Decline coverage</div>
        <p className="iz-tiny iz-muted mb-3">Tell the agency why you cannot take this shift — they will find someone else.</p>
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

      <IzSheet open={swapOpen} onClose={() => setSwapOpen(false)}>
        <div className="iz-cardttl">Request swap</div>
        {agencyTonight && (
          <p className="iz-tiny iz-muted mb-2">
            Leaving{" "}
            <strong className="text-[var(--iz-txt)]">
              {agencyTonight.outlet}
            </strong>{" "}
            · {agencyTonight.date} · {agencyTonight.shift}
          </p>
        )}
        <p className="iz-tiny iz-muted mb-3">Pick a different shift to move to. Atlas will approve and assign a replacement for your current slot.</p>
        {swapTargets.length === 0 ? (
          <p className="iz-tiny iz-muted rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
            No other shifts available to swap into right now.
          </p>
        ) : (
          <div className="mb-3 space-y-2">
            {swapTargets.map((target) => {
              const selected = swapTargetId === target.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setSwapTargetId(target.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.1)]"
                      : "border-[var(--iz-line)] bg-white/[0.02] hover:bg-white/[0.04]",
                  )}
                >
                  <p className="font-sora text-sm font-bold">{target.outlet}</p>
                  <p className="iz-tiny iz-muted mt-0.5">
                    {target.date} · {target.shift}
                  </p>
                </button>
              );
            })}
          </div>
        )}
        <textarea className="iz-pv-dispute-input mb-3" rows={2} placeholder="Reason (optional)" value={swapReason} onChange={(e) => setSwapReason(e.target.value)} />
        <button type="button" className="iz-btn iz-btn-primary w-full" disabled={!swapTargetId} onClick={submitSwap}>
          Send request
        </button>
      </IzSheet>
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
      <select className="iz-field-input mb-3 mt-1 w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </>
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
      <PrOfferRowActions primaryLabel="Accept" onPrimary={onApprove} onSecondary={onReject} secondaryLabel="Reject" />
    </div>
  );
}

function OfferDetailSheet({
  tied,
  offer,
  listing,
  onConfirm,
  onDecline,
}: {
  tied: boolean;
  offer?: AgencyTiedOffer;
  listing?: MarketplaceListing;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const o = offer ?? listing!;
  const lat = listing?.lat ?? 3.1478;
  const lng = listing?.lng ?? 101.7005;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const briefing = offer?.briefing ?? listing?.briefing ?? "";

  return (
    <>
      <div className="iz-cardttl">{o.outlet}</div>
      <p className="iz-tiny iz-muted mb-1">
        {fmtDFriendly(o.date[0], o.date[1], o.date[2])} · {o.time}
      </p>
      <p className="iz-tiny iz-muted mb-3">{o.event}</p>
      <div className="iz-gps-map mb-2" style={{ height: 64 }}>
        <span className="iz-ping" style={{ left: "50%", top: "50%" }} />
      </div>
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="iz-tiny mb-3 inline-flex items-center gap-1 text-[var(--iz-blue)]">
        <ExternalLink className="h-3 w-3" /> Maps
      </a>
      <p className="iz-tiny iz-muted mb-3 line-clamp-3">{briefing}</p>
      <div className="iz-between iz-tiny mb-4">
        <span className="iz-muted">{o.addr}</span>
        <span className="font-sora font-bold text-[var(--iz-gold)]">{formatRM(o.base + o.comm)}</span>
      </div>
      {listing?.tierSlots && (
        <div className="mb-4 space-y-1">
          {listing.tierSlots.map((s) => (
            <p key={s.tier} className="iz-tiny iz-muted2">{s.tier} ×{s.count} · {s.hours}</p>
          ))}
        </div>
      )}
      <div className="iz-grid2">
        <button type="button" className="iz-btn iz-btn-soft" onClick={onDecline}>Decline</button>
        <button type="button" className="iz-btn iz-btn-primary" onClick={onConfirm}>{tied ? "Request" : "Apply"}</button>
      </div>
    </>
  );
}
