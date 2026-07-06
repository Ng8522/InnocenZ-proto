import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { OutletPage, OutletPageHeader } from "@/components/outlet/outlet-portal-ui";
import { IzPageTitle } from "@/components/iz/ui";
import { OutletOperationsCalendar } from "@/components/outlet/OutletOperationsCalendar";
import { outletCan } from "@/lib/outlet-rbac";

export const Route = createFileRoute("/outlet/ratings")({
  component: CalendarPage,
});

function CalendarPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletName = useStore((s) => s.outletWorkspace.outletName);
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
    </OutletPage>
  );
}
