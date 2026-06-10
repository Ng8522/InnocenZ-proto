import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShiftHistoryLog } from "@/components/iz/ShiftHistoryLog";
import { shiftHistoryForOutlet, tonightShiftOutletName } from "@/lib/portal-sync";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/outlet/history")({
  component: OutletHistory,
});

function OutletHistory() {
  const shiftHistory = useStore((s) => s.shiftHistory);
  const shifts = useStore((s) => s.shifts);
  const outletName = tonightShiftOutletName(shifts);
  const rows = useMemo(
    () => shiftHistoryForOutlet(shiftHistory, outletName),
    [shiftHistory, outletName],
  );
  const subtitle = useMemo(() => {
    if (rows.length === 0) return undefined;
    const sorted = [...rows].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const oldest = sorted[0]?.dateDisplay;
    const newest = sorted[sorted.length - 1]?.dateDisplay;
    const totalPayout = rows.reduce((a, r) => a + r.totalPayout, 0);
    const range = oldest && newest && oldest !== newest ? `${oldest} – ${newest}` : oldest ?? newest;
    return `${rows.length} PR shifts · ${range} · RM ${totalPayout.toLocaleString()} paid out`;
  }, [rows]);

  return <ShiftHistoryLog portal="outlet" rows={rows} subtitle={subtitle} />;
}
