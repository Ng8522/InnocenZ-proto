import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore, type Booking } from "@/lib/store";
import { Clock, History, Languages, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/host/history")({
  component: ShiftHistoryPage,
});

function ShiftHistoryPage() {
  const history = useStore((s) =>
    s.bookings
      .filter((b) => b.status === "completed")
      .sort((a, b) => (b.checkedOutAt ?? "").localeCompare(a.checkedOutAt ?? "")),
  );

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Host" title="Shift History" />
      <div className="px-5 pt-5">
        {history.length === 0 ? (
          <div className="rounded-2xl bg-gradient-surface p-6 text-center shadow-card">
            <History className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No completed shifts yet</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Accept a shift, check in on Tonight, then check out — your shift will appear here.
            </p>
            <Link
              to="/host"
              className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-xs font-semibold"
            >
              Browse shifts
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((b) => (
              <HistoryCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ booking: b }: { booking: Booking }) {
  return (
    <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{b.outletName}</div>
          <div className="text-[11px] text-muted-foreground">{b.event}</div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          Completed
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {b.date} · {b.shift}
        </span>
        <span className="flex items-center gap-1">
          <Languages className="h-3 w-3" /> {b.languages}
        </span>
      </div>
      {(b.checkedInAt || b.checkedOutAt) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {b.checkedInAt && (
            <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-success">
              <LogIn className="h-3 w-3" /> In {b.checkedInAt}
            </span>
          )}
          {b.checkedOutAt && (
            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-1 text-gold">
              <LogOut className="h-3 w-3" /> Out {b.checkedOutAt}
            </span>
          )}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Earned</span>
        <span className="text-sm font-semibold text-gradient-gold">RM {b.pay}</span>
      </div>
    </div>
  );
}
