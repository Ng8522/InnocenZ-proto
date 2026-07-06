import { format, parseISO } from "date-fns";
import { Crown, Star } from "lucide-react";
import type { ShiftHistoryPrRollup, ShiftHistoryRow } from "@/lib/shift-history-utils";
import { shiftHistorySubline } from "@/lib/shift-history";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "rgba(167, 139, 250, 0.35)", text: "#c4b5fd" },
  { bg: "rgba(96, 165, 250, 0.35)", text: "#93c5fd" },
  { bg: "rgba(74, 222, 128, 0.35)", text: "#86efac" },
  { bg: "rgba(244, 183, 64, 0.35)", text: "#fcd34d" },
];

export type OutletPrRating = {
  id: string;
  pr: string;
  stars: number;
  note: string;
  date: string;
  tags?: string[];
};

function avatarStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

function formatLatestLabel(dateIso: string, dateDisplay: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    try {
      const d = parseISO(dateIso);
      return `Latest ${format(d, "EEE")} · ${format(d, "d MMM")}`;
    } catch {
      /* use fallback */
    }
  }
  return `Latest ${dateDisplay}`;
}

/** Compact RM for outlet history cards — drops .00 when whole ringgit. */
export function formatOutletHistRm(value: number) {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

const PR_RATING_ALIASES: Record<string, string> = {
  victoria: "vicky",
  vicky: "vicky",
};

function ratingNameKey(name: string) {
  const key = name.trim().toLowerCase();
  return PR_RATING_ALIASES[key] ?? key;
}

export function findOutletRatingForPr(
  prName: string,
  ratings: OutletPrRating[],
): OutletPrRating | undefined {
  const key = ratingNameKey(prName);
  return ratings.find((r) => ratingNameKey(r.pr) === key);
}

function OutletStarPill({ stars }: { stars: number }) {
  if (stars <= 0) return null;
  return (
    <span className="iz-outlet-hist-stars" aria-label={`${stars} star rating`}>
      {Array.from({ length: stars }).map((_, i) => (
        <Star key={i} className="h-2.5 w-2.5 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
      ))}
    </span>
  );
}

export function OutletShiftLogRatingBlock({ rating }: { rating: OutletPrRating }) {
  return (
    <section className="iz-outlet-shift-log-rating">
      <div className="iz-outlet-shift-log-rating__head">
        <span className="iz-outlet-shift-log-rating__label">Rating</span>
        {rating.date && <span className="iz-outlet-shift-log-rating__date">{rating.date}</span>}
      </div>
      <div className="iz-outlet-shift-log-rating__body">
        <span className="iz-outlet-shift-log-rating__stars" aria-hidden>
          {Array.from({ length: rating.stars }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
          ))}
        </span>
        {rating.note && <p className="iz-outlet-shift-log-rating__quote">&ldquo;{rating.note}&rdquo;</p>}
      </div>
    </section>
  );
}

export function OutletShiftLogShiftCard({ row }: { row: ShiftHistoryRow }) {
  return (
    <article className="iz-outlet-shift-log-card">
      <div className="iz-outlet-shift-log-card__head">
        <div>
          <p className="iz-outlet-shift-log-card__date">{row.dateDisplay}</p>
          <p className="iz-outlet-shift-log-card__sub">{shiftHistorySubline(row, "outlet")}</p>
        </div>
        <div className="iz-outlet-shift-log-card__total-wrap">
          <p className="iz-outlet-shift-log-card__total">{formatOutletHistRm(row.totalPayout)}</p>
          <p className="iz-outlet-shift-log-card__hours">{row.durationHours}h shift</p>
        </div>
      </div>
      <div className="iz-outlet-shift-log-card__metrics">
        <div className="iz-outlet-shift-log-card__metric iz-outlet-shift-log-card__metric--earned">
          <span className="iz-outlet-shift-log-card__metric-label">Earned</span>
          <span className="iz-outlet-shift-log-card__metric-value">{formatOutletHistRm(row.totalPayout)}</span>
        </div>
        <div className="iz-outlet-shift-log-card__metric iz-outlet-shift-log-card__metric--drinks">
          <span className="iz-outlet-shift-log-card__metric-label">Drinks</span>
          <span className="iz-outlet-shift-log-card__metric-value">{row.totalDrinks}</span>
        </div>
        <div className="iz-outlet-shift-log-card__metric iz-outlet-shift-log-card__metric--tips">
          <span className="iz-outlet-shift-log-card__metric-label">Tips</span>
          <span className="iz-outlet-shift-log-card__metric-value">{formatOutletHistRm(row.totalTips)}</span>
        </div>
      </div>
    </article>
  );
}

export function OutletShiftLogSummaryCard({
  shiftCount,
  outletName,
  prName,
  agencyLabel,
  totalPayout,
  totalDrinks,
  totalTips,
}: {
  shiftCount: number;
  outletName: string;
  prName: string;
  agencyLabel?: string;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
}) {
  return (
    <article className="iz-outlet-shift-log-summary">
      <p className="iz-outlet-shift-log-summary__hint">
        {shiftCount} shift{shiftCount !== 1 ? "s" : ""} at {outletName} · {prName}
        {agencyLabel ? ` · ${agencyLabel}` : ""}
      </p>
      <div className="iz-outlet-shift-log-summary__metrics">
        <div className="iz-outlet-shift-log-summary__metric">
          <span className="iz-outlet-shift-log-summary__metric-label">Total earned</span>
          <span className="iz-outlet-shift-log-summary__metric-value">{formatOutletHistRm(totalPayout)}</span>
        </div>
        <div className="iz-outlet-shift-log-summary__metric">
          <span className="iz-outlet-shift-log-summary__metric-label">Total drinks</span>
          <span className="iz-outlet-shift-log-summary__metric-value">{totalDrinks}</span>
        </div>
        <div className="iz-outlet-shift-log-summary__metric">
          <span className="iz-outlet-shift-log-summary__metric-label">Total tips</span>
          <span className="iz-outlet-shift-log-summary__metric-value">{formatOutletHistRm(totalTips)}</span>
        </div>
      </div>
    </article>
  );
}

export function OutletPrHistoryCard({
  rollup,
  rank,
  topPayout,
  rating,
  onTap,
}: {
  rollup: ShiftHistoryPrRollup;
  rank: number;
  topPayout: number;
  rating?: OutletPrRating;
  onTap?: () => void;
}) {
  const agency =
    rollup.venues.length === 1
      ? rollup.venues[0]
      : rollup.venues.length > 1
        ? `${rollup.venues.length} agencies`
        : "—";
  const initial = rollup.prName.trim().charAt(0).toUpperCase() || "?";
  const avatar = avatarStyle(rollup.prName);
  const pct = topPayout > 0 ? Math.round((rollup.totalPayout / topPayout) * 100) : 0;
  const pctLabel = rank === 1 ? "100% of top earner" : `${pct}% of top earner`;

  const content = (
    <article className="iz-outlet-hist-card">
      <div className="iz-outlet-hist-card__head">
        <div className="iz-outlet-hist-card__identity">
          <div className="iz-outlet-hist-avatar-wrap">
            {rank === 1 ? (
              <span className="iz-outlet-hist-crown" aria-label="Top earner">
                <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
              </span>
            ) : rank > 1 ? (
              <span className="iz-outlet-hist-rank-badge" aria-label={`Rank ${rank}`}>
                {rank}
              </span>
            ) : null}
            <div
              className="iz-outlet-hist-avatar"
              style={{ background: avatar.bg, color: avatar.text }}
              aria-hidden
            >
              {initial}
            </div>
          </div>
          <div className="iz-outlet-hist-card__names">
            <div className="iz-outlet-hist-card__name-row">
              <p className="iz-outlet-hist-card__name">{rollup.prName}</p>
              {rating && rating.stars > 0 && <OutletStarPill stars={rating.stars} />}
            </div>
            <p className="iz-outlet-hist-card__agency">{agency}</p>
          </div>
        </div>
        <div className="iz-outlet-hist-card__shifts">
          <p className="iz-outlet-hist-card__shift-count">
            {rollup.shiftCount} shift{rollup.shiftCount !== 1 ? "s" : ""}
          </p>
          <p className="iz-outlet-hist-card__latest">
            {formatLatestLabel(rollup.latestDateIso, rollup.latestDateDisplay)}
          </p>
        </div>
      </div>

      <div className="iz-outlet-hist-metrics">
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--earned">
          <span className="iz-outlet-hist-metric__label">Earned</span>
          <span className="iz-outlet-hist-metric__value">{formatOutletHistRm(rollup.totalPayout)}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--drinks">
          <span className="iz-outlet-hist-metric__label">Drinks</span>
          <span className="iz-outlet-hist-metric__value">{rollup.totalDrinks}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--tips">
          <span className="iz-outlet-hist-metric__label">Tips</span>
          <span className="iz-outlet-hist-metric__value">{formatOutletHistRm(rollup.totalTips)}</span>
        </div>
      </div>

      <div className="iz-outlet-hist-bar">
        <div className="iz-outlet-hist-bar__track">
          <div
            className={cn("iz-outlet-hist-bar__fill", rank === 1 && "iz-outlet-hist-bar__fill--top")}
            style={{ width: `${Math.max(pct, rank === 1 ? 100 : 4)}%` }}
          />
        </div>
        <span className="iz-outlet-hist-bar__label">{pctLabel}</span>
      </div>
    </article>
  );

  if (onTap) {
    return (
      <button type="button" className="iz-outlet-hist-card-btn" onClick={onTap}>
        {content}
      </button>
    );
  }

  return content;
}
