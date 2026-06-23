import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AgencyPaidPvHistory } from "@/components/agency/AgencyPaidPvHistory";
import { ShiftHistoryLog } from "@/components/iz/ShiftHistoryLog";
import { useStore } from "@/lib/store";

type HistoryTab = "shifts" | "outlets" | "paid";

export const Route = createFileRoute("/agency/history")({
  component: AgencyHistory,
  validateSearch: (search: Record<string, unknown>): { tab?: HistoryTab; pv?: string } => {
    const tabRaw = search.tab;
    const tab =
      tabRaw === "paid" ? "paid" : tabRaw === "outlets" ? "outlets" : undefined;
    const pv = typeof search.pv === "string" && search.pv.trim() ? search.pv.trim() : undefined;
    return { tab, pv };
  },
});

function AgencyHistory() {
  const navigate = useNavigate();
  const { tab: tabFromSearch, pv: pvFromSearch } = Route.useSearch();
  const tab: HistoryTab =
    tabFromSearch === "paid" ? "paid" : tabFromSearch === "outlets" ? "outlets" : "shifts";

  const shiftHistory = useStore((s) => s.shiftHistory);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const agencyPRs = useStore((s) => s.agencyPRs);

  const paidCount = prPaymentVouchers.filter((p) => p.status === "PAID").length;
  const outletCount = useMemo(
    () => new Set(shiftHistory.map((r) => r.outlet)).size,
    [shiftHistory],
  );

  const setTab = (next: HistoryTab) => {
    void navigate({
      to: "/agency/history",
      search: next === "shifts" ? {} : { tab: next },
      replace: true,
    });
  };

  return (
    <div className="iz-screen">
      <p className="iz-tiny iz-muted2 uppercase tracking-widest">InnocenZ · Agency</p>
      <h2 className="font-sora mx-0.5 mt-0.5 text-[22px] font-extrabold text-[var(--iz-txt)]">History</h2>

      <div className="iz-payroll-tabs mt-3">
        <button
          type="button"
          className={`iz-payroll-tab${tab === "shifts" ? " on" : ""}`}
          onClick={() => setTab("shifts")}
        >
          By PR
        </button>
        <button
          type="button"
          className={`iz-payroll-tab${tab === "outlets" ? " on" : ""}`}
          onClick={() => setTab("outlets")}
        >
          By outlet ({outletCount})
        </button>
        <button
          type="button"
          className={`iz-payroll-tab${tab === "paid" ? " on" : ""}`}
          onClick={() => setTab("paid")}
        >
          Paid PVs ({paidCount})
        </button>
      </div>

      {tab === "shifts" && (
        <ShiftHistoryLog
          key="history-by-pr"
          portal="agency"
          groupBy="pr"
          rows={shiftHistory}
          subtitle="PR view — totals per PR. Tap a PR, then tap an outlet to see every shift."
          embedded
        />
      )}

      {tab === "outlets" && (
        <ShiftHistoryLog
          key="history-by-outlet"
          portal="agency"
          groupBy="venue"
          rows={shiftHistory}
          subtitle="Agency view — totals per outlet across PR shifts. Tap a row for PR breakdown."
          embedded
        />
      )}

      {tab === "paid" && (
        <AgencyPaidPvHistory
          pvs={prPaymentVouchers}
          receiptScans={prReceiptScans}
          agencyPRs={agencyPRs}
          initialPvId={pvFromSearch}
          onClearInitialPv={() =>
            void navigate({ to: "/agency/history", search: { tab: "paid" }, replace: true })
          }
        />
      )}
    </div>
  );
}
