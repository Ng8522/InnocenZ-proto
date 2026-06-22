export type ComcardDemoStyle = {
  /** Display name on the comcard plate */
  plate: string;
  bgFrom: string;
  bgMid: string;
  bgTo: string;
  skin: string;
  hair: string;
  outfit: string;
  outfitAccent: string;
  /** Slight body rotation for pose variety */
  poseDeg: number;
  /** Scale tweak for height feel */
  figureScale: number;
};

export const DEMO_COMCARDS: Record<string, ComcardDemoStyle> = {
  p1: {
    plate: "VICKY",
    bgFrom: "rgba(88, 28, 135, 0.55)",
    bgMid: "rgba(22, 18, 38, 0.95)",
    bgTo: "rgba(217, 185, 122, 0.22)",
    skin: "rgba(255, 218, 198, 0.92)",
    hair: "rgba(35, 22, 18, 0.95)",
    outfit: "rgba(217, 185, 122, 0.72)",
    outfitAccent: "rgba(255, 240, 210, 0.35)",
    poseDeg: -4,
    figureScale: 1.04,
  },
  p2: {
    plate: "MIA",
    bgFrom: "rgba(124, 58, 237, 0.45)",
    bgMid: "rgba(28, 20, 48, 0.94)",
    bgTo: "rgba(244, 114, 182, 0.18)",
    skin: "rgba(255, 224, 205, 0.9)",
    hair: "rgba(55, 32, 28, 0.92)",
    outfit: "rgba(192, 132, 252, 0.68)",
    outfitAccent: "rgba(244, 114, 182, 0.4)",
    poseDeg: 6,
    figureScale: 1,
  },
  p3: {
    plate: "VIVI",
    bgFrom: "rgba(16, 120, 90, 0.42)",
    bgMid: "rgba(18, 24, 32, 0.95)",
    bgTo: "rgba(217, 185, 122, 0.16)",
    skin: "rgba(235, 198, 168, 0.9)",
    hair: "rgba(28, 22, 18, 0.94)",
    outfit: "rgba(52, 211, 153, 0.62)",
    outfitAccent: "rgba(217, 185, 122, 0.38)",
    poseDeg: -2,
    figureScale: 1.06,
  },
  p5: {
    plate: "NINA",
    bgFrom: "rgba(180, 83, 9, 0.38)",
    bgMid: "rgba(30, 22, 18, 0.94)",
    bgTo: "rgba(251, 191, 36, 0.14)",
    skin: "rgba(240, 200, 168, 0.88)",
    hair: "rgba(42, 28, 20, 0.93)",
    outfit: "rgba(245, 158, 11, 0.58)",
    outfitAccent: "rgba(255, 228, 170, 0.32)",
    poseDeg: 3,
    figureScale: 0.96,
  },
  p6: {
    plate: "YUKI",
    bgFrom: "rgba(59, 130, 246, 0.35)",
    bgMid: "rgba(15, 23, 42, 0.96)",
    bgTo: "rgba(148, 163, 184, 0.2)",
    skin: "rgba(255, 228, 212, 0.9)",
    hair: "rgba(22, 28, 38, 0.95)",
    outfit: "rgba(148, 163, 184, 0.65)",
    outfitAccent: "rgba(191, 219, 254, 0.35)",
    poseDeg: -5,
    figureScale: 1.02,
  },
  p4: {
    plate: "CICI",
    bgFrom: "rgba(190, 24, 93, 0.4)",
    bgMid: "rgba(32, 18, 28, 0.94)",
    bgTo: "rgba(251, 113, 133, 0.16)",
    skin: "rgba(255, 220, 205, 0.9)",
    hair: "rgba(48, 26, 32, 0.92)",
    outfit: "rgba(244, 63, 94, 0.6)",
    outfitAccent: "rgba(253, 164, 175, 0.38)",
    poseDeg: 5,
    figureScale: 0.98,
  },
  "freelancer-jaya": {
    plate: "JAYA",
    bgFrom: "rgba(14, 116, 144, 0.42)",
    bgMid: "rgba(18, 28, 38, 0.95)",
    bgTo: "rgba(251, 146, 60, 0.18)",
    skin: "rgba(230, 188, 158, 0.9)",
    hair: "rgba(32, 24, 18, 0.94)",
    outfit: "rgba(45, 212, 191, 0.62)",
    outfitAccent: "rgba(251, 146, 60, 0.38)",
    poseDeg: 4,
    figureScale: 1,
  },
  p7: {
    plate: "CHEN WEI",
    bgFrom: "rgba(30, 58, 138, 0.45)",
    bgMid: "rgba(15, 20, 32, 0.96)",
    bgTo: "rgba(217, 185, 122, 0.18)",
    skin: "rgba(255, 216, 190, 0.88)",
    hair: "rgba(30, 24, 20, 0.94)",
    outfit: "rgba(59, 130, 246, 0.55)",
    outfitAccent: "rgba(217, 185, 122, 0.42)",
    poseDeg: 0,
    figureScale: 1.03,
  },
};

const DEFAULT_COMCARD: ComcardDemoStyle = {
  plate: "PR",
  bgFrom: "rgba(88, 28, 135, 0.45)",
  bgMid: "rgba(30, 27, 46, 0.92)",
  bgTo: "rgba(217, 185, 122, 0.12)",
  skin: "rgba(255, 220, 198, 0.85)",
  hair: "rgba(45, 30, 25, 0.9)",
  outfit: "rgba(167, 139, 250, 0.65)",
  outfitAccent: "rgba(255, 255, 255, 0.2)",
  poseDeg: 0,
  figureScale: 1,
};

export function getComcardDemoStyle(prId?: string, name?: string): ComcardDemoStyle {
  if (prId && DEMO_COMCARDS[prId]) return DEMO_COMCARDS[prId];
  if (name) {
    const key = Object.keys(DEMO_COMCARDS).find(
      (id) => DEMO_COMCARDS[id].plate === name.toUpperCase() || DEMO_COMCARDS[id].plate.startsWith(name.toUpperCase()),
    );
    if (key) return DEMO_COMCARDS[key];
  }
  return {
    ...DEFAULT_COMCARD,
    plate: name?.toUpperCase().slice(0, 12) ?? "PR",
  };
}
