import { createFileRoute } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { COMCARD, getPrProfile } from "@/lib/pr-demo";
import { Camera, Shield, Star } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";

export const Route = createFileRoute("/host/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const prSubRole = useStore((s) => s.prSubRole);
  const outletRatingStars = useStore((s) => s.outletRatingStars);
  const setOutletRatingStars = useStore((s) => s.setOutletRatingStars);
  const toast = useStore((s) => s.toast);

  const u = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">Profile & Ratings</h2>

      <IzCard className="mt-3">
        <div className="flex gap-2.5">
          <div className="iz-avatar !h-[54px] !w-[54px] text-xl" style={{ background: u.avg }}>
            {u.av}
          </div>
          <div className="min-w-0 flex-1">
            <div className="iz-between">
              <div className="font-sora text-[17px] font-bold">{u.name}</div>
              <span className="iz-tier">
                <Star className="h-3 w-3" /> {u.tier}
              </span>
            </div>
            <p className="iz-tiny iz-muted mt-0.5">
              {tied ? "Agency-Tied · Atlas Agency" : "Freelancer"} · IC {u.ic}
            </p>
          </div>
        </div>
        <div className="iz-grid3 mt-3">
          <div className="iz-stat-tile">
            <div className="n text-[var(--iz-gold)]">{u.rep}?</div>
            <div className="l">Reputation</div>
          </div>
          <div className="iz-stat-tile">
            <div className="n">{u.shifts}</div>
            <div className="l">Shifts</div>
          </div>
          <div className="iz-stat-tile">
            <div className="n">{u.noshow}</div>
            <div className="l">No-shows</div>
          </div>
        </div>
      </IzCard>

      <IzCard flat className="mt-2.5">
        <div className="iz-between iz-tiny mb-1.5">
          <span className="iz-muted">Workforce lifecycle · {u.tier}</span>
          <b>{u.prog}%</b>
        </div>
        <div className="iz-bar-track">
          <div className="iz-bar-fill bg-[var(--iz-grad-gold)]" style={{ width: `${u.prog}%` }} />
        </div>
        <p className="iz-tiny iz-muted2 mt-1.5">{u.next}</p>
      </IzCard>

      <IzSectionLabel>3D Comcard · ?? ? v3</IzSectionLabel>
      <IzCard>
        <div className="flex justify-around text-center">
          <div>
            <div className="font-sora text-xl font-extrabold text-[var(--iz-gold-l)]">
              {COMCARD.height}
              <span className="iz-tiny iz-muted"> cm</span>
            </div>
            <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">HEIGHT</div>
          </div>
          <div>
            <div className="font-sora text-xl font-extrabold text-[var(--iz-gold-l)]">
              {COMCARD.weight}
              <span className="iz-tiny iz-muted"> kg</span>
            </div>
            <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">WEIGHT</div>
          </div>
          <div>
            <div className="font-sora text-xl font-extrabold text-[var(--iz-gold-l)]">{COMCARD.age}</div>
            <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">AGE</div>
          </div>
        </div>
      </IzCard>

      <IzSectionLabel>Portfolio gallery ? v3</IzSectionLabel>
      <IzCard>
        <div className="iz-pgrid">
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              className="iz-pcell"
              onClick={() => toast(`Upload portfolio photo ${i}`, "info")}
            >
              <Camera className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </IzCard>

      <IzSectionLabel>Languages</IzSectionLabel>
      <IzCard flat>
        <div className="flex flex-wrap gap-1.5">
          {u.langs.map((l) => (
            <IzPill key={l} variant="violet">
              {l}
            </IzPill>
          ))}
        </div>
      </IzCard>

      <IzSectionLabel>Rate an outlet you worked</IzSectionLabel>
      <IzCard>
        <div className="iz-between">
          <span className="iz-sm">Velvet 23 · 4 May</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOutletRatingStars(n)}
                className={n <= outletRatingStars ? "text-[var(--iz-gold)]" : "text-[var(--iz-muted2)]"}
              >
                <Star className="h-[22px] w-[22px]" fill={n <= outletRatingStars ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
        <p className="iz-tiny iz-muted2 mt-2">
          {outletRatingStars ? `${outletRatingStars} / 5 stars selected` : "Tap the stars to rate"}
        </p>
        {outletRatingStars > 0 && (
          <button
            type="button"
            className="iz-btn iz-btn-primary iz-btn-sm mt-2.5 w-auto"
            onClick={() => {
              toast(`Rated Velvet 23 ${outletRatingStars}? — permanent & public`, "success");
              setOutletRatingStars(0);
            }}
          >
            Submit {outletRatingStars}? rating
          </button>
        )}
      </IzCard>

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <Shield className="mr-1 inline h-3 w-3" />
        IC + address collected under PDPA disclaimer. Ratings are mutual & permanent.
      </IzCard>
    </div>
  );
}
