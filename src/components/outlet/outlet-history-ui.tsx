import { format, parseISO } from "date-fns";
import { Crown } from "lucide-react";
import { useState } from "react";
import type { ShiftHistoryPrRollup } from "@/lib/shift-history-utils";
import { findAgencyManagedPr, resolveAgencyPrPhoto } from "@/lib/agency-demo";
import { formatRM } from "@/components/iz/ui";
import { ShiftMetricIconLabel } from "@/components/outlet/outlet-history-metrics";
import { publicAssetPath } from "@/lib/public-asset";
import { useStore } from "@/lib/store";
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

function OutletPrAvatar({ prId, prName }: { prId: string; prName: string }) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyPr = findAgencyManagedPr(agencyPRs, prId, prName);
  const photoSrc = agencyPr ? resolveAgencyPrPhoto(agencyPr) : null;
  const [photoFailed, setPhotoFailed] = useState(false);
  const initial = prName.trim().charAt(0).toUpperCase() || "?";
  const avatar = avatarStyle(prName);

  if (photoSrc && !photoFailed) {
    return (
      <div className="iz-outlet-hist-avatar iz-outlet-hist-avatar--photo" aria-hidden>
        <img
          src={publicAssetPath(photoSrc)}
          alt=""
          onError={() => setPhotoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="iz-outlet-hist-avatar"
      style={{ background: avatar.bg, color: avatar.text }}
      aria-hidden
    >
      {initial}
    </div>
  );
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
          <OutletPrAvatar prId={rollup.prId} prName={rollup.prName} />
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
            <ShiftMetricIconLabel kind="earned" size="lg" />
          </span>
          <span className="iz-outlet-hist-metric__value">{formatRM(rollup.totalPayout)}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--drinks">
          <span className="iz-outlet-hist-metric__label">
            <ShiftMetricIconLabel kind="drinks" size="lg" />
          </span>
          <span className="iz-outlet-hist-metric__value">{rollup.totalDrinks}</span>
        </div>
        <div className="iz-outlet-hist-metric iz-outlet-hist-metric--tips">
          <span className="iz-outlet-hist-metric__label">
            <ShiftMetricIconLabel kind="tips" size="lg" />
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
