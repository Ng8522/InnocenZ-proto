import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { OutletPage, OutletPageHeader } from "@/components/outlet/outlet-portal-ui";
import { IzPageTitle } from "@/components/iz/ui";
import { OutletOperationsCalendar } from "@/components/outlet/OutletOperationsCalendar";
import { OutletSection } from "@/components/outlet/OutletSection";
import { outletCan } from "@/lib/outlet-rbac";
import { Star } from "lucide-react";

export const Route = createFileRoute("/outlet/ratings")({
  component: CalendarPage,
});

function CalendarPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletName = useStore((s) => s.outletWorkspace.outletName);
  const ratings = useStore((s) => s.ratings);
  const canView = outletCan(outletSubRole, "ratePrs") || outletCan(outletSubRole, "viewLiveDashboard");

  if (!canView) {
    return (
      <div className="iz-screen">
        <header>
          <IzPageTitle>Calendar page</IzPageTitle>
        </header>
        <p className="iz-tiny iz-muted mt-4 rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
          Your role cannot access upcoming shifts.
        </p>
      </div>
    );
  }

  return (
    <OutletPage>
      <OutletPageHeader
        eyebrow={outletName}
        title="Calendar"
        hint="Upcoming shifts — click a day to view details."
      />

      <OutletOperationsCalendar />

      {ratings.length > 0 && (
        <OutletSection
          title="Recent ratings"
          hint={`${ratings.length} submitted`}
          collapsible
          defaultOpen={false}
          className="!mt-4"
        >
          <div className="space-y-1.5">
            {ratings.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--iz-line)] px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold">{r.pr}</span>
                  {r.note && <p className="iz-tiny iz-muted truncate">{r.note}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-0.5 text-[var(--iz-gold)]">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </OutletSection>
      )}
    </OutletPage>
  );
}
