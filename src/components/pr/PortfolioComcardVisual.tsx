import { comcardWeight, type ComcardPreviewData } from "@/components/agency/Comcard3dPreview";
import { cn } from "@/lib/utils";

/** First four filled portfolio slots — used for the photo comcard grid */
export function portfolioPhotosForComcard(portfolio: (string | null)[]): string[] {
  return portfolio.filter((src): src is string => Boolean(src)).slice(0, 4);
}

export function canGeneratePortfolioComcard(portfolio: (string | null)[]): boolean {
  return portfolioPhotosForComcard(portfolio).length >= 4;
}

export function PortfolioComcardVisual({
  photos,
  pr,
  className,
}: {
  photos: string[];
  pr: ComcardPreviewData;
  className?: string;
}) {
  const weight = comcardWeight(pr.weight);
  const grid = photos.slice(0, 4);

  return (
    <div className={cn("iz-portfolio-comcard", className)}>
      <div className="iz-portfolio-comcard__frame">
        <div className="iz-portfolio-comcard__grid" aria-hidden={false}>
          {grid.map((src, i) => (
            <div key={i} className="iz-portfolio-comcard__cell">
              <img src={src} alt="" />
            </div>
          ))}
        </div>
        <div className="iz-portfolio-comcard__overlay">
          <p className="iz-portfolio-comcard__name">{pr.name}</p>
          <p className="iz-portfolio-comcard__line">Age {pr.age}</p>
          <p className="iz-portfolio-comcard__line">
            {pr.height}cm · {weight}kg
          </p>
        </div>
        <span className="iz-portfolio-comcard__badge">Photo Comcard</span>
      </div>
    </div>
  );
}
