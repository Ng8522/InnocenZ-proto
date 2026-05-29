import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agency/pv")({
  component: AgencyPV,
});

function AgencyPV() {
  const { pvs, toast } = useStore();

  return (
    <div>
      <AppHeader subtitle="Module 7" title="Payment vouchers" />
      <div className="space-y-3 px-5 pt-5">
        {pvs.map((pv) => {
          const total = pv.wages + pv.drinkCommission + pv.tipCommission + pv.tableCommission;
          return (
            <div key={pv.id} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
              <div className="flex justify-between text-sm font-semibold">
                <span>{pv.prName}</span>
                <span className="uppercase text-[10px] text-primary">{pv.status}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {pv.outlet} · {pv.date}
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Wages</span><span>RM {pv.wages}</span></div>
                <div className="flex justify-between"><span>Drinks</span><span>RM {pv.drinkCommission}</span></div>
                <div className="flex justify-between"><span>Tables</span><span>RM {pv.tableCommission}</span></div>
                <div className="flex justify-between"><span>Tips</span><span>RM {pv.tipCommission}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                  <span>Total</span><span className="text-gradient-gold">RM {total}</span>
                </div>
              </div>
              {pv.status === "draft" && (
                <button
                  onClick={() => toast("PV sent to PR for e-signature", "success")}
                  className="mt-3 w-full rounded-full bg-gradient-primary py-2 text-xs font-semibold"
                >
                  Send to PR
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
