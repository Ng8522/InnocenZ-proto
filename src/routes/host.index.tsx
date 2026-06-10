import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrOfferRow, PrOfferRowActions, PrStatusPill } from "@/components/pr/PrOfferRow";
import { PrSection } from "@/components/pr/PrSection";
import { useStore } from "@/lib/store";
import { PR_SHIFT_OFFERS, SHIFT_TODAY, fmtDFriendly, fmtDShort, getPrProfile, getPrRosterId } from "@/lib/pr-demo";
import {
  PR_AGENCY_TIED_OFFERS,
  PR_MARKETPLACE_LISTINGS,
  tiedOfferToShiftIndex,
  type AgencyTiedOffer,
  type MarketplaceListing,
} from "@/lib/pr-features";
import { ArrowLeftRight, ExternalLink, Filter, MapPin } from "lucide-react";
import { formatRM } from "@/components/iz/ui";

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
  const simulateOutletAcceptApplication = useStore((s) => s.simulateOutletAcceptApplication);
  const simulateOutletDeclineApplication = useStore((s) => s.simulateOutletDeclineApplication);
  const prFreelancerLowRatingStrikes = useStore((s) => s.prFreelancerLowRatingStrikes);
  const requestPrSwap = useStore((s) => s.requestPrSwap);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const prDeclinedOfferIds = useStore((s) => s.prDeclinedOfferIds);
  const prMarketplaceApplication = useStore((s) => s.prMarketplaceApplication);
  const prUpcomingShifts = useStore((s) => s.prUpcomingShifts);
  const prSwapRequests = useStore((s) => s.prSwapRequests);
  const approveOutletSwapByPr = useStore((s) => s.approveOutletSwapByPr);
  const declineOutletSwapByPr = useStore((s) => s.declineOutletSwapByPr);
  const approveAgencyAssignmentByPr = useStore((s) => s.approveAgencyAssignmentByPr);
  const declineAgencyAssignmentByPr = useStore((s) => s.declineAgencyAssignmentByPr);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);

  const [confirmTiedId, setConfirmTiedId] = useState<string | null>(null);
  const [confirmMktId, setConfirmMktId] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapReplacement, setSwapReplacement] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [mktFilters, setMktFilters] = useState<MktFilters>(EMPTY_MKT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const profile = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";
  const todayLine = fmtDFriendly(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2]);
  const activeShift =
    shiftAccepted && acceptedShiftIndex != null ? PR_SHIFT_OFFERS[acceptedShiftIndex] ?? PR_SHIFT_OFFERS[0] : null;
  const firstName = (prDisplayName ?? profile.first).split(" ")[0];
  const myRosterId = getPrRosterId(prSubRole);

  const pendingOutletSwaps = agencyRoster.filter((s) => s.prId === myRosterId && s.outletSwap?.status === "pending_pr");
  const pendingAgencyAssignments = agencyRoster.filter((s) => s.prId === myRosterId && s.status === "assignment-pending");
  const inboxCount = pendingAgencyAssignments.length + pendingOutletSwaps.length;

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
  const statusLabel = shiftAccepted ? (checkedIn ? "On duty" : "Confirmed") : pendingApproval ? "Pending" : "Browsing";

  const submitSwap = () => {
    if (!swapReplacement.trim()) return;
    requestPrSwap(swapReplacement, swapReason);
    setSwapOpen(false);
    setSwapReplacement("");
    setSwapReason("");
  };

  const hideOfferActions = shiftAccepted || pendingApproval || prMarketplaceApplication?.status === "pending";

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

      {!shiftAccepted && !pendingApproval && prMarketplaceApplication?.status !== "pending" && (
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

      {shiftAccepted && activeShift && (
        <div className="iz-pr-hero mt-4">
          <p className="iz-tiny iz-muted2 uppercase tracking-wide">{checkedIn ? "On duty" : "Tonight"}</p>
          <p className="font-sora mt-1 text-[16px] font-extrabold">{activeShift.outlet}</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {activeShift.time} · {formatRM(activeShift.base + activeShift.comm)}
          </p>
          <Link to="/host/tonight" className="iz-btn iz-btn-primary iz-btn-sm mt-3 w-full">
            <MapPin className="h-3.5 w-3.5" />
            {checkedIn ? "Attendance" : "Check in"}
          </Link>
          {tied && !checkedIn && (
            <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full" onClick={() => setSwapOpen(true)}>
              <ArrowLeftRight className="h-3.5 w-3.5" /> Request swap
            </button>
          )}
        </div>
      )}

      {(pendingApproval || prMarketplaceApplication?.status === "pending") && (
        <div className="iz-pr-note mt-4 flex flex-wrap items-center justify-between gap-2 border-[rgba(244,183,64,.35)]">
          <span className="text-[var(--iz-amber)]">
            {pendingApproval ? "Awaiting agency approval" : "Application pending"}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="iz-btn iz-btn-soft iz-btn-sm !py-1.5"
              onClick={pendingApproval ? approvePrShift : simulateOutletAcceptApplication}
            >
              Simulate accept
            </button>
            {prMarketplaceApplication?.status === "pending" && (
              <button
                type="button"
                className="iz-btn iz-btn-ghost iz-btn-sm !py-1.5"
                onClick={simulateOutletDeclineApplication}
              >
                Simulate decline
              </button>
            )}
          </div>
        </div>
      )}

      {!tied && prFreelancerLowRatingStrikes >= 3 && (
        <p className="iz-pr-note mt-3 border-[rgba(255,107,107,.35)] text-[var(--iz-red)]">
          Marketplace suspended — 3 ratings below 3.0★. See Profile for details.
        </p>
      )}

      {tied && inboxCount > 0 && (
        <PrSection title="Agency inbox" hint={`${inboxCount} need your response`} collapsible defaultOpen>
          <div className="iz-pr-list">
            {pendingAgencyAssignments.map((slot) => (
              <InboxCard
                key={slot.id}
                title={slot.outlet}
                subtitle={`Assignment · ${slot.shiftStart}–${slot.shiftEnd}`}
                onApprove={() => approveAgencyAssignmentByPr(slot.id)}
                onReject={() => declineAgencyAssignmentByPr(slot.id)}
              />
            ))}
            {pendingOutletSwaps.map((slot) => (
              <InboxCard
                key={slot.id}
                title={`${slot.outlet} → ${slot.outletSwap!.targetOutlet}`}
                subtitle="Outlet swap"
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

      {prSwapRequests.length > 0 && tied && (
        <PrSection title="Swap requests" collapsible defaultOpen={false}>
          <div className="iz-pr-list">
            {prSwapRequests.slice(0, 3).map((s) => (
              <PrOfferRow
                key={s.id}
                title={s.outlet}
                subtitle={`Replacement: ${s.replacementPrName}`}
                badge={<PrStatusPill>{s.status.replace("_", " ")}</PrStatusPill>}
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
                    subtitle={`${o.time} · ${o.distance}`}
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
                    subtitle={`${l.area} · Tier ${l.tierMin}+`}
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
              applyFreelancerListing(confirmMkt.id);
              setConfirmMktId(null);
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

      <IzSheet open={swapOpen} onClose={() => setSwapOpen(false)}>
        <div className="iz-cardttl">Request swap</div>
        <p className="iz-tiny iz-muted mb-3">Name a replacement PR for agency approval.</p>
        <input className="iz-field-input mb-3 w-full" placeholder="Replacement name" value={swapReplacement} onChange={(e) => setSwapReplacement(e.target.value)} />
        <textarea className="iz-pv-dispute-input mb-3" rows={2} placeholder="Reason (optional)" value={swapReason} onChange={(e) => setSwapReason(e.target.value)} />
        <button type="button" className="iz-btn iz-btn-primary" onClick={submitSwap}>Send request</button>
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
