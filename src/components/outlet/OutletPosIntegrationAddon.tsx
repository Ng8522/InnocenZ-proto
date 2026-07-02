import { Plug } from "lucide-react";
import { IzCard, IzPill } from "@/components/iz/ui";

type OutletPosIntegrationAddonProps = {
  canEdit: boolean;
  pending: boolean;
  onRequest: () => void;
  onCancel: () => void;
};

export function OutletPosIntegrationAddon({
  canEdit,
  pending,
  onRequest,
  onCancel,
}: OutletPosIntegrationAddonProps) {
  return (
    <IzCard className="border-[rgba(139,92,246,.22)] bg-gradient-to-br from-[rgba(139,92,246,.07)] via-transparent to-transparent">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(139,92,246,.28)] bg-[rgba(139,92,246,.12)]">
          <Plug className="h-5 w-5 text-[var(--iz-violet-l)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sora text-sm font-bold">Integrate with POS</p>
            {pending && <IzPill variant="amber">Pending review</IzPill>}
          </div>
          <p className="iz-tiny iz-muted mt-1 max-w-md leading-relaxed">
            Connect your point-of-sale for real-time sales sync and automated commission reconciliation.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:text-right">
          <div>
            <p className="iz-tiny iz-muted2 uppercase tracking-wide">Custom pricing</p>
            <p className="mt-0.5 text-sm font-bold text-[var(--iz-gold-l)]">Call to get price</p>
          </div>
          {canEdit &&
            (pending ? (
              <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
                <p className="iz-tiny iz-muted">Request sent — admin will contact you</p>
                <button
                  type="button"
                  className="iz-btn iz-btn-soft w-full sm:min-w-[9.5rem]"
                  onClick={onCancel}
                >
                  Cancel request
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="iz-btn iz-btn-soft w-full sm:w-auto sm:min-w-[9.5rem]"
                onClick={onRequest}
              >
                Contact admin
              </button>
            ))}
        </div>
      </div>
    </IzCard>
  );
}
