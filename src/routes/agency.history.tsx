import { createFileRoute } from "@tanstack/react-router";
import { ShiftHistoryLog } from "@/components/iz/ShiftHistoryLog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agency/history")({
  component: AgencyHistory,
});

function AgencyHistory() {
  const shiftHistory = useStore((s) => s.shiftHistory);
  const toast = useStore((s) => s.toast);
  return (
    <ShiftHistoryLog
      portal="agency"
      rows={shiftHistory}
      onExport={() => toast("agency-history.xlsx downloaded", "success")}
    />
  );
}
