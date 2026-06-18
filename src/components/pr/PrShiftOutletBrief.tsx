import { useState } from "react";
import { Building2, ExternalLink, MapPin, Shirt, Sparkles, Star } from "lucide-react";
import { IzPill } from "@/components/iz/ui";
import { cn } from "@/lib/utils";
import type { PrShiftOutletBrief } from "@/lib/pr-shift-outlet";

export function PrShiftOutletBriefCard({
  brief,
  assignmentLabel,
  defaultOpen = false,
}: {
  brief: PrShiftOutletBrief;
  assignmentLabel?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const initial = brief.name.trim()[0]?.toUpperCase() ?? "O";

  return (
    <div className={cn("iz-pr-outlet-brief", open && "is-open")}>
      <button
        type="button"
        className="iz-pr-outlet-brief__hero"
        style={{ background: brief.heroGradient }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="iz-pr-outlet-brief__hero-overlay" aria-hidden />
        <div className="iz-pr-outlet-brief__hero-top">
          {assignmentLabel && <span className="iz-pr-outlet-brief__assign">{assignmentLabel}</span>}
          <div className="iz-pr-outlet-brief__hero-badges">
            {brief.vip && (
              <IzPill variant="amber" className="!text-[9px]">
                <Sparkles className="h-3 w-3" /> VIP night
              </IzPill>
            )}
          </div>
        </div>
        <div className="iz-pr-outlet-brief__hero-mark">{initial}</div>
        <div className="iz-pr-outlet-brief__hero-foot">
          <h2 className="iz-pr-outlet-brief__name">{brief.name}</h2>
          <p className="iz-pr-outlet-brief__event">{brief.event}</p>
          <span className="iz-pr-outlet-brief__action">{open ? "Tap to collapse" : "Tap to expand"}</span>
        </div>
      </button>

      {open && (
        <div className="iz-pr-outlet-brief__body">
        <div className="iz-pr-outlet-brief__row">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold-l)]" />
          <div className="min-w-0">
            <p className="iz-pr-outlet-brief__row-label">Address</p>
            <p className="iz-pr-outlet-brief__row-value">{brief.streetAddress}</p>
            <p className="iz-tiny iz-muted2 mt-0.5">{brief.address} · {brief.distance} away</p>
          </div>
        </div>

        <div className="iz-pr-outlet-brief__grid">
          <div>
            <p className="iz-pr-outlet-brief__meta-k">Shift</p>
            <p className="iz-pr-outlet-brief__meta-v">{brief.shiftDate}</p>
            <p className="iz-tiny iz-muted2">{brief.shiftTime}</p>
          </div>
          <div>
            <p className="iz-pr-outlet-brief__meta-k">Dress code</p>
            <p className="iz-pr-outlet-brief__meta-v flex items-center gap-1">
              <Shirt className="h-3 w-3 text-[var(--iz-violet-l)]" />
              {brief.dressCode}
            </p>
          </div>
          <div>
            <p className="iz-pr-outlet-brief__meta-k">Est. payout</p>
            <p className="iz-pr-outlet-brief__meta-v text-[var(--iz-gold-l)]">{brief.estPayout}</p>
            <p className="iz-tiny iz-muted2 flex items-center gap-1">
              <Star className="h-3 w-3" /> {brief.rating} outlet
            </p>
          </div>
        </div>

        {brief.opsContact && (
          <div className="iz-pr-outlet-brief__row !mt-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--iz-muted)]" />
            <div>
              <p className="iz-pr-outlet-brief__row-label">Outlet contact</p>
              <p className="iz-pr-outlet-brief__row-value">{brief.opsContact}</p>
            </div>
          </div>
        )}

        {brief.agencyNote && (
          <p className="iz-pr-outlet-brief__note">{brief.agencyNote}</p>
        )}

        <a
          href={brief.directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="iz-outlet-quick-chip mt-3 inline-flex w-full justify-center"
        >
          <ExternalLink className="h-3 w-3" /> Open directions in Maps
        </a>
        </div>
      )}
    </div>
  );
}
