import { format, parseISO } from "date-fns";
import { Banknote, Coins, Crown, Wine } from "lucide-react";
import type { ShiftHistoryPrRollup } from "@/lib/shift-history-utils";
import { formatRM } from "@/components/iz/ui";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "rgba(167, 139, 250, 0.35)", text: "#c4b5fd" },
  { bg: "rgba(96, 165, 250, 0.35)", text: "#93c5fd" },
  { bg: "rgba(74, 222, 128, 0.35)", text: "#86efac" },
  { bg: "rgba(244, 183, 64, 0.35)", text: "#fcd34d" },
];

function avatarStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

function formatLatestLabel(dateIso: string, dateDisplay: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    try {
      const d = parseISO(dateIso);
      return `Latest ${format(d, "EEE")} • ${format(d, "d MMM")}`;
    } catch {
      /* use fallback */
    }
  }
  return `Latest ${dateDisplay}`;
}

export function OutletPrHistoryCard({
  rollup,
  rank,
  topPayout,
  onTap,
}: {
  rollup: ShiftHistoryPrRollup;
  rank: number;
  topPayout: number;
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
          <div
            className={cn(
              "iz-outlet-hist-rank",
              rank === 1 && "iz-outlet-hist-rank--gold",
              rank === 3 && "iz-outlet-hist-rank--bronze",
            )}
            aria-label={`Rank ${rank}`}
          >
            {rank === 1 ? <Crown className="h-3.5 w-3.5" strokeWidth={2.25} /> : rank}
          </div>
          <div
            className="iz-outlet-hist-avatar"
            style={{ background: avatar.bg, color: avatar.text }}
            aria-hidden
          >
            {initial}
          </div>
          <div className="iz-outlet-hist-card__names">
            <p className="iz-outlet-hist-card__name">{rollup.prName}</p>
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
          <span className="iz-outlet-hist-metric__label">
            <Coins className="h-3 w-3" aria-hidden />
            Earned
          </span>
          <span className="iz-outlet-hist-metric__value">{formatRM(rollup.totalPayout)}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--drinks">
          <span className="iz-outlet-hist-metric__label">
            <Wine className="h-3 w-3" aria-hidden />
            Drinks
          </span>
          <span className="iz-outlet-hist-metric__value">{rollup.totalDrinks}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--tips">
          <span className="iz-outlet-hist-metric__label">
            <Banknote className="h-3 w-3" aria-hidden />
            Tips
          </span>
          <span className="iz-outlet-hist-metric__value">{formatRM(rollup.totalTips)}</span>
        </div>
      </div>

      <div className="iz-outlet-hist-bar">
        <div className="iz-outlet-hist-bar__track">
          <div
            className={cn(
              "iz-outlet-hist-bar__fill",
              rank === 1 && "iz-outlet-hist-bar__fill--top",
            )}
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
