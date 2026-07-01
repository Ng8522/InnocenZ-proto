import { IzSheet } from "@/components/iz/Sheet";
import { formatRM } from "@/components/iz/ui";
import type { OutletPrLiveEarningsBreakdown } from "@/lib/outlet-financial-sync";

function AmountCell({ amount }: { amount: number }) {
  return (
    <td className="iz-outlet-live-earnings-table__amount">{formatRM(amount)}</td>
  );
}

export function OutletPrLiveSalesSheet({
  open,
  onClose,
  shiftEvent,
  breakdown,
}: {
  open: boolean;
  onClose: () => void;
  shiftEvent: string;
  breakdown: OutletPrLiveEarningsBreakdown;
}) {
  return (
    <IzSheet open={open} onClose={onClose} wide liveSales>
      <div className="iz-cardttl">Live sales · {breakdown.prName}</div>
      <p className="iz-sm iz-muted mt-1.5">{shiftEvent} · tonight floor</p>

      <div className="iz-outlet-live-earnings-table-wrap iz-outlet-live-earnings-table-wrap--sheet mt-4">
        <table className="iz-outlet-live-earnings-table iz-outlet-live-earnings-table--sheet">
          <thead>
            <tr>
              <th>PR Name</th>
              <th>PR ID</th>
              <th>Daily wages</th>
              <th>HH</th>
              <th>Normal</th>
              <th>Tips</th>
              <th>OT</th>
              <th>Total earn</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="iz-outlet-live-earnings-table__name">{breakdown.prName}</td>
              <td className="iz-outlet-live-earnings-table__id">{breakdown.prId}</td>
              <td className="iz-outlet-live-earnings-table__wage">{formatRM(breakdown.dailyWagesRm)}</td>
              <AmountCell amount={breakdown.hhCommissionRm} />
              <AmountCell amount={breakdown.normalCommissionRm} />
              <AmountCell amount={breakdown.tipCommissionRm} />
              <AmountCell amount={breakdown.otPayRm} />
              <td className="iz-outlet-live-earnings-table__total">{formatRM(breakdown.totalEarnRm)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {breakdown.hhDrinkSalesRm === 0 &&
        breakdown.normalDrinkSalesRm === 0 &&
        breakdown.tipSalesRm === 0 && (
          <p className="iz-sm iz-muted2 mt-4 text-center">
            No floor sales logged for this PR yet tonight.
          </p>
        )}

      <button type="button" className="iz-btn iz-btn-soft mt-4 w-full" onClick={onClose}>
        Close
      </button>
    </IzSheet>
  );
}
