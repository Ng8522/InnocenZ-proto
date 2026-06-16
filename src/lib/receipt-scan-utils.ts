import type { PrReceiptItem, PrReceiptScan } from "@/lib/pr-demo";

export function normalizeReceiptRef(ref: string): string {
  return ref.trim().toUpperCase();
}

export function findReceiptByRef(scans: PrReceiptScan[], receiptRef: string): PrReceiptScan | undefined {
  const norm = normalizeReceiptRef(receiptRef);
  return scans.find((s) => normalizeReceiptRef(s.receiptRef) === norm);
}

export type ReceiptScanDraft = {
  receiptRef: string;
  outlet: string;
  prCode: string;
  prName: string;
  prId: string;
  items: PrReceiptItem[];
  totalLogged: number;
};

export function validateReceiptScan(
  scans: PrReceiptScan[],
  draft: ReceiptScanDraft,
  scannerPrId: string,
): { ok: true } | { ok: false; message: string } {
  const ref = draft.receiptRef?.trim();
  if (!ref) {
    return { ok: false, message: "Receipt ID missing on slip — cannot log commission" };
  }

  const existing = findReceiptByRef(scans, ref);
  if (existing) {
    const who = existing.prName || existing.prId || "another PR";
    return {
      ok: false,
      message: `Receipt ${ref} already scanned by ${who} · duplicate blocked`,
    };
  }

  if (!draft.prId?.trim()) {
    return { ok: false, message: "Receipt has no PR ID — commission cannot be assigned" };
  }

  if (draft.prId !== scannerPrId) {
    return {
      ok: false,
      message: `Receipt is stamped for PR ${draft.prId} — only that PR can claim commission`,
    };
  }

  return { ok: true };
}
