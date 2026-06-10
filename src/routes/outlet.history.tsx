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
  return <ShiftHistoryLog portal="outlet" rows={rows} />;
}
