import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { IzCard, formatRM } from "@/components/iz/ui";
import { PrWeeklyPaymentGrid } from "@/components/pr/PrWeeklyPaymentGrid";
import { PrStatusPill } from "@/components/pr/PrOfferRow";
import { pvNeedsPrReview, pvStatusLabel, pvStatusPillVariant } from "@/lib/pr-demo";
import type { PrPaymentVoucher } from "@/lib/pr-demo";
import { isPrPaymentInboxPv } from "@/lib/pr-payment-history";
import type { WeeklyPaymentSummary } from "@/lib/pr-weekly-payment";
import { cn } from "@/lib/utils";

export function PrWeeklyPaymentWeekCard({
  title,
  summary,
  weekPhase,
  defaultOpen = true,
  pv,
  onOpenPv,
}: {
  title: string;
  summary: WeeklyPaymentSummary;
  weekPhase: "open" | "issued";
  defaultOpen?: boolean;
  pv?: PrPaymentVoucher | null;
  onOpenPv?: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const needsReview = Boolean(pv && pvNeedsPrReview(pv.status));
  const inboxPv = pv && isPrPaymentInboxPv(pv) ? pv : null;

  return (
    <section
      className={cn(
        "iz-collapsible-section iz-pr-week-pay-collapsible",
        open && "is-open",
        needsReview && "iz-pr-week-pay-collapsible--review",
      )}
    >
      <button
        type="button"
        className="iz-collapsible-section__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          <span className="iz-collapsible-section__title">{title}</span>
          {!open && (
            <span className="iz-collapsible-section__hint">
              {summary.weekLabel} · {formatRM(summary.totals.net)} · {summary.verifiedDayCount}/7 verified
            </span>
          )}
          <span className="iz-collapsible-section__action">{open ? "Tap to collapse" : "Tap to expand"}</span>
        </span>
        {pv && (
          <PrStatusPill variant={pvStatusPillVariant(pv.status)}>{pvStatusLabel(pv.status)}</PrStatusPill>
        )}
        <span className="iz-pr-week-pay-collapsible__verified font-sora text-base font-extrabold text-[var(--iz-violet-l)]">
          {summary.verifiedDayCount}/7
        </span>
        <span className="iz-collapsible-section__chev" aria-hidden>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="iz-collapsible-section__body iz-pr-week-pay-collapsible__body">
          <IzCard className="iz-pr-week-pay-card !mt-0">
            <div className="iz-pr-week-pay-card__head">
              <div>
                <p className="iz-pr-week-pay-card__title">{title}</p>
                <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">{summary.weekLabel}</p>
              </div>
              <div className="text-right">
                <p className="iz-tiny iz-muted2">Verified days</p>
                <p className="font-sora text-base font-extrabold text-[var(--iz-violet-l)]">
                  {summary.verifiedDayCount}/7
                </p>
              </div>
            </div>
            <PrWeeklyPaymentGrid summary={summary} large weekPhase={weekPhase} />
            {weekPhase === "open" && !summary.pvReady ? (
              <p className="iz-tiny iz-muted2 mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-2">
                Totals include every <b>checked-out</b> shift this week (pending lines still count). Your weekly
                PV is issued on{" "}
                <b className="text-[var(--iz-gold-l)]">{summary.issueDayLabel} (Sun)</b> — dispute any wrong line
                before then. Week total so far:{" "}
                <b className="text-[var(--iz-gold)]">{formatRM(summary.totals.net)}</b>
              </p>
            ) : weekPhase === "open" && summary.pvReady && inboxPv ? (
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-full"
                onClick={() => onOpenPv?.(inboxPv.id)}
              >
                Open this week&apos;s PV · {formatRM(inboxPv.net)}
              </button>
            ) : weekPhase === "issued" ? (
              <p className="iz-tiny iz-muted2 mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-2">
                PV issued on <b className="text-[var(--iz-gold-l)]">{summary.issueDayLabel} (Sun)</b> ·{" "}
                {needsReview ? (
                  <>
                    <b className="text-[var(--iz-amber)]">awaiting your review</b> — dispute any wrong line
                    before signing.
                  </>
                ) : (
                  <>week total <b className="text-[var(--iz-gold)]">{formatRM(summary.totals.net)}</b></>
                )}
              </p>
            ) : null}
            {weekPhase === "issued" && inboxPv && needsReview && (
              <button
                type="button"
                className="iz-btn iz-btn-primary iz-btn-sm mt-2 w-full"
                onClick={() => onOpenPv?.(inboxPv.id)}
              >
                Review &amp; sign · {formatRM(inboxPv.net)}
              </button>
            )}
            {weekPhase === "issued" && inboxPv && !needsReview && inboxPv.status === "DISPUTED" && (
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-full"
                onClick={() => onOpenPv?.(inboxPv.id)}
              >
                View dispute · {formatRM(inboxPv.net)}
              </button>
            )}
          </IzCard>
        </div>
      )}
    </section>
  );
}
