import { IzPill } from "@/components/iz/ui";
import { getComcardDemoStyle } from "@/lib/comcard-demo";
import { cn } from "@/lib/utils";

export type ComcardPreviewData = {
  id?: string;
  name: string;
  height: number;
  weight?: number;
  age: number;
};

const DEFAULT_WEIGHT = 52;

export function comcardWeight(weight?: number) {
  return weight ?? DEFAULT_WEIGHT;
}

function ComcardFigure({
  style,
  compact,
}: {
  style: ReturnType<typeof getComcardDemoStyle>;
  compact?: boolean;
}) {
  return (
    <div
      className="iz-comcard-3d-preview-figure"
      style={{
        transform: `rotate(${style.poseDeg}deg) scale(${compact ? style.figureScale * 0.92 : style.figureScale})`,
        ["--cc-skin" as string]: style.skin,
        ["--cc-hair" as string]: style.hair,
        ["--cc-outfit" as string]: style.outfit,
        ["--cc-outfit-accent" as string]: style.outfitAccent,
      }}
      aria-hidden
    >
      <div className="iz-comcard-3d-preview-hair" />
      <div className="iz-comcard-3d-preview-head" />
      <div className="iz-comcard-3d-preview-torso" />
    </div>
  );
}

function ComcardStage({
  pr,
  compact,
}: {
  pr: ComcardPreviewData;
  compact?: boolean;
}) {
  const style = getComcardDemoStyle(pr.id, pr.name);
  const weight = comcardWeight(pr.weight);

  return (
    <div
      className="iz-comcard-3d-preview-stage"
      style={{
        background: `linear-gradient(145deg, ${style.bgFrom} 0%, ${style.bgMid} 52%, ${style.bgTo} 100%)`,
      }}
    >
      {!compact && (
        <>
          <div className="iz-comcard-3d-preview-plate">
            {(pr.name.trim().slice(0, 12) || style.plate).toUpperCase()}
          </div>
          <div className="iz-comcard-3d-preview-floor" aria-hidden />
        </>
      )}
      <ComcardFigure style={style} compact={compact} />
      {!compact && (
        <div className="iz-comcard-3d-preview-measures">
          {pr.height}cm · {weight}kg · {pr.age}y
        </div>
      )}
      {!compact && (
        <IzPill variant="violet" className="iz-comcard-3d-preview-badge !py-0.5 !text-[9px]">
          3D Comcard
        </IzPill>
      )}
    </div>
  );
}

export function Comcard3dPreviewThumb({
  pr,
  className,
}: {
  pr?: ComcardPreviewData;
  className?: string;
}) {
  const fallback: ComcardPreviewData = { name: "PR", height: 165, age: 24 };
  const data = pr ?? fallback;

  return (
    <div className={cn("iz-comcard-3d-preview iz-comcard-3d-preview--thumb", className)}>
      <ComcardStage pr={data} compact />
    </div>
  );
}

function ComcardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-sora text-lg font-extrabold text-[var(--iz-gold-l)]">{value}</div>
      <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">{label}</div>
    </div>
  );
}

export function Comcard3dPreviewVisual({
  pr,
  className,
  showName = true,
  showStats = true,
}: {
  pr: ComcardPreviewData;
  className?: string;
  showName?: boolean;
  showStats?: boolean;
}) {
  const weight = comcardWeight(pr.weight);

  return (
    <div className={cn("iz-comcard-3d-preview", className)}>
      <ComcardStage pr={pr} />
      {showStats && (
        <div className="iz-comcard-3d-preview-stats">
          <ComcardStat label="HEIGHT" value={`${pr.height} cm`} />
          <ComcardStat label="WEIGHT" value={`${weight} kg`} />
          <ComcardStat label="AGE" value={String(pr.age)} />
        </div>
      )}
      {showName && (
        <p className="iz-tiny iz-muted mt-2 text-center truncate">{pr.name}</p>
      )}
    </div>
  );
}
