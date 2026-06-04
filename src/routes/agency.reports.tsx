import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";

export const Route = createFileRoute("/agency/reports")({
  component: AgencyReports,
});

function AgencyReports() {
  return (
    <div className="iz-screen">
      <AppHeader subtitle="Module 6" title="Agency analytics" />
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net profit</div>
          <div className="mt-2 font-display text-2xl font-semibold text-success">RM 12.4k</div>
        </div>
        <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">No-show rate</div>
          <div className="mt-2 font-display text-2xl font-semibold">4.2%</div>
        </div>
      </div>
      <p className="mx-5 mt-4 text-[11px] text-muted-foreground">
        Auto reports on 15th &amp; month-end. Finance sub-role: payroll + PV + collection only.
      </p>
    </div>
  );
}
