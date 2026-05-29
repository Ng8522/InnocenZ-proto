import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agency/pending")({
  component: AgencyPending,
});

function AgencyPending() {
  const { pendingPRs, approvePendingPR, rejectPendingPR } = useStore();
  const list = pendingPRs.filter((p) => p.status === "pending");

  return (
    <div>
      <AppHeader subtitle="Module 1" title="Pending PR approvals" />
      <div className="space-y-3 px-5 pt-5">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">No pending sign-ups</p>
        ) : (
          list.map((p) => (
            <div key={p.id} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
              <div className="font-semibold">{p.name}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{p.languages}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approvePendingPR(p.id)}
                  className="flex-1 rounded-full bg-gradient-primary py-2 text-xs font-semibold"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectPendingPR(p.id)}
                  className="flex-1 rounded-full border border-border py-2 text-xs"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
