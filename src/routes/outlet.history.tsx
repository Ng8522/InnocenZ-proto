import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShiftHistoryLog } from "@/components/iz/ShiftHistoryLog";
import { OUTLET_VENUE_NAME } from "@/lib/shift-history";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/outlet/history")({
  component: OutletHistory,
});

function OutletHistory() {
  const shiftHistory = useStore((s) => s.shiftHistory);
  const rows = useMemo(
    () => shiftHistory.filter((r) => r.outlet === OUTLET_VENUE_NAME),
    [shiftHistory],
  );
  return <ShiftHistoryLog portal="outlet" rows={rows} />;
}
