import { createFileRoute } from "@tanstack/react-router";
import { ShiftHistoryLog } from "@/components/iz/ShiftHistoryLog";
import { OUTLET_VENUE_NAME } from "@/lib/shift-history";
import { useStore } from "@/lib/store";
import { useMemo } from "react";

export const Route = createFileRoute("/outlet/history")({
  component: OutletHistory,
});

function OutletHistory() {
  const all = useStore((s) => s.shiftHistory);
  const shiftHistory = useMemo(
    () => all.filter((r) => r.outlet === OUTLET_VENUE_NAME),
    [all],
  );
  return <ShiftHistoryLog portal="outlet" rows={shiftHistory} />;
}
