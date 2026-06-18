import { useState } from "react";
import type { AgencyManagedPR } from "@/lib/agency-demo";
import { languagesFromPr } from "@/lib/agency-demo";
import {
  Comcard3dPreviewThumb,
  Comcard3dPreviewVisual,
  comcardWeight,
  type ComcardPreviewData,
} from "@/components/agency/Comcard3dPreview";
import { IzSheet } from "@/components/iz/Sheet";
import { IzPill } from "@/components/iz/ui";
import { cn } from "@/lib/utils";

const COMCARD_FALLBACK = { height: 165, weight: 52, age: 24 };

export function toComcardPreview(
  pr: Pick<AgencyManagedPR, "id" | "name" | "height" | "weight" | "age">,
): ComcardPreviewData {
  return {
    id: pr.id,
    name: pr.name,
    height: pr.height ?? COMCARD_FALLBACK.height,
    weight: pr.weight ?? COMCARD_FALLBACK.weight,
    age: pr.age ?? COMCARD_FALLBACK.age,
  };
}

export function comcardPreviewFromSlot(
  slot: { prId: string; prName: string },
  pr?: AgencyManagedPR | null,
): ComcardPreviewData {
  if (pr) return toComcardPreview(pr);
  return {
    id: slot.prId,
    name: slot.prName,
    height: COMCARD_FALLBACK.height,
    weight: COMCARD_FALLBACK.weight,
    age: COMCARD_FALLBACK.age,
  };
}

type PrComcardIdentityProps = {
  pr: ComcardPreviewData;
  profile?: AgencyManagedPR | null;
  agencyName?: string;
  size?: "table" | "week";
  className?: string;
};

export function PrComcardIdentity({
  pr,
  profile,
  agencyName,
  size = "table",
  className,
}: PrComcardIdentityProps) {
  const [open, setOpen] = useState(false);
  const langs = profile ? languagesFromPr(profile) : [];

  return (
    <>
      <button
        type="button"
        className={cn(
          "iz-pr-comcard-thumb-btn",
          size === "week" && "iz-pr-comcard-thumb-btn--week",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label={`View comcard for ${pr.name}`}
        title={`View ${pr.name}'s comcard`}
      >
        <Comcard3dPreviewThumb pr={pr} />
      </button>

      <IzSheet open={open} onClose={() => setOpen(false)}>
        <div className="iz-cardttl mb-1">{pr.name}</div>
        {agencyName && <p className="iz-tiny iz-muted mb-3">{agencyName}</p>}
        <Comcard3dPreviewVisual pr={pr} showName={false} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile?.trainingLevel && (
            <IzPill variant="ink" className="!py-0.5 !text-[9px]">
              {profile.trainingLevel}
            </IzPill>
          )}
          {profile?.rating != null && (
            <IzPill variant="gold" className="!py-0.5 !text-[9px]">
              {profile.rating}★
            </IzPill>
          )}
          {langs.slice(0, 3).map((lang) => (
            <IzPill key={lang} variant="violet" className="!py-0.5 !text-[9px]">
              {lang}
            </IzPill>
          ))}
        </div>
        <p className="iz-tiny iz-muted2 mt-3 text-center">
          {pr.height} cm · {comcardWeight(pr.weight)} kg · {pr.age}y
          {profile?.place ? ` · ${profile.place}` : ""}
        </p>
      </IzSheet>
    </>
  );
}
