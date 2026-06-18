import { rosterSlotAgencyName, type AgencyManagedPR, type AgencyRosterSlot, type RosterSlotStatus } from "@/lib/agency-demo";
import { comcardPreviewFromSlot, PrComcardIdentity } from "@/components/agency/PrComcardIdentity";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { ArrowLeftRight, Pencil } from "lucide-react";

const STATUS_LABEL: Record<
  RosterSlotStatus,
  { label: string; variant: "green" | "amber" | "red" | "violet" | "ink" }
> = {
  "on-duty": { label: "On duty", variant: "green" },
  "en-route": { label: "En route", variant: "amber" },
  scheduled: { label: "Scheduled", variant: "ink" },
  unavailable: { label: "Unavailable", variant: "red" },
  "swap-pending": { label: "Swap pending", variant: "violet" },
  "assignment-pending": { label: "Awaiting PR", variant: "amber" },
  "outlet-pending": { label: "Awaiting outlet", variant: "amber" },
};

export function RosterShiftTable({
  slots,
  agencyPRs,
  canAssign,
  onEdit,
  onFlagLate,
  onFlagNoShow,
  onCancelSwap,
}: {
  slots: AgencyRosterSlot[];
  agencyPRs: AgencyManagedPR[];
  canAssign: boolean;
  onEdit: (id: string) => void;
  onFlagLate: (id: string) => void;
  onFlagNoShow: (id: string) => void;
  onCancelSwap: (id: string) => void;
}) {
  if (slots.length === 0) {
    return (
      <IzCard className="text-center">
        <p className="iz-sm iz-muted">No shifts match your filters — try clearing or widening the search.</p>
      </IzCard>
    );
  }

  const prById = new Map(agencyPRs.map((p) => [p.id, p]));

  return (
    <>
      <p className="iz-tiny iz-muted2 mb-2 hidden md:block">
        Tap a <strong className="text-[var(--iz-gold-l)]">comcard</strong> to identify PRs ·{" "}
        <strong className="text-[var(--iz-gold-l)]">Edit</strong> to change status, shift times, or request outlet swap.
      </p>

      <div className="iz-roster-table-wrap hidden md:block">
        <table className="iz-roster-table">
          <thead>
            <tr>
              <th>PR</th>
              <th>Agency</th>
              <th>Outlet</th>
              <th>Shift</th>
              <th>Check-in</th>
              <th>Status</th>
              <th>Drinks</th>
              <th>Tips</th>
              <th>Est. payout</th>
              {canAssign && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <RosterTableRow
                key={slot.id}
                slot={slot}
                profile={prById.get(slot.prId)}
                canAssign={canAssign}
                onEdit={onEdit}
                onFlagLate={onFlagLate}
                onFlagNoShow={onFlagNoShow}
                onCancelSwap={onCancelSwap}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {slots.map((slot) => (
          <RosterShiftCard
            key={slot.id}
            slot={slot}
            profile={prById.get(slot.prId)}
            canAssign={canAssign}
            onEdit={onEdit}
            onFlagLate={onFlagLate}
            onFlagNoShow={onFlagNoShow}
            onCancelSwap={onCancelSwap}
          />
        ))}
      </div>
    </>
  );
}

function StatusPills({ slot }: { slot: AgencyRosterSlot }) {
  const st = STATUS_LABEL[slot.status];
  return (
    <div className="flex flex-wrap gap-1">
      {slot.lateFlag && <IzPill variant="amber">Late</IzPill>}
      {slot.noShowFlag && <IzPill variant="red">No-show</IzPill>}
      <IzPill variant={st.variant}>{st.label}</IzPill>
    </div>
  );
}

function RosterTableRow({
  slot,
  profile,
  canAssign,
  onEdit,
  onFlagLate,
  onFlagNoShow,
  onCancelSwap,
}: {
  slot: AgencyRosterSlot;
  profile?: AgencyManagedPR;
  canAssign: boolean;
  onEdit: (id: string) => void;
  onFlagLate: (id: string) => void;
  onFlagNoShow: (id: string) => void;
  onCancelSwap: (id: string) => void;
}) {
  const showFlags =
    canAssign && !slot.checkedInAt && slot.status !== "unavailable" && slot.status !== "swap-pending";
  const showEdit =
    canAssign && slot.status !== "swap-pending" && slot.status !== "assignment-pending";

  return (
    <tr className={slot.outletSwap?.status === "pending_pr" ? "iz-roster-row--swap" : undefined}>
      <td>
        <div className="iz-portal-table-pr">
          <PrComcardIdentity
            pr={comcardPreviewFromSlot(slot, profile)}
            profile={profile}
            agencyName={rosterSlotAgencyName(slot)}
          />
          <span className="iz-portal-table-name">{slot.prName}</span>
        </div>
        {slot.outletSwap?.status === "pending_pr" && (
          <p className="iz-roster-swap-note mt-1">
            Swap → {slot.outletSwap.targetOutlet}
          </p>
        )}
      </td>
      <td className="iz-portal-table-meta">{rosterSlotAgencyName(slot)}</td>
      <td className="iz-portal-table-meta">{slot.outlet}</td>
      <td className="iz-portal-table-meta iz-portal-table-shift">
        {slot.shiftStart} – {slot.shiftEnd}
      </td>
      <td className="iz-portal-table-meta">{slot.checkedInAt ?? "—"}</td>
      <td className="iz-portal-table-status">
        <StatusPills slot={slot} />
      </td>
      <td className="iz-portal-table-meta">{slot.floorDrinks ?? 0}</td>
      <td className="iz-portal-table-meta">{slot.floorTips ? formatRM(slot.floorTips) : "—"}</td>
      <td className="text-[var(--iz-gold-l)] font-semibold">
        {formatRM(slot.estPayout ?? 0)}
      </td>
      {canAssign && (
        <td>
          <div className="iz-roster-row-actions">
            {showEdit && (
              <button type="button" className="iz-roster-icon-btn" onClick={() => onEdit(slot.id)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {showFlags && (
              <>
                <button
                  type="button"
                  className={`iz-roster-mini-btn${slot.lateFlag ? " on" : ""}`}
                  onClick={() => onFlagLate(slot.id)}
                >
                  Late
                </button>
                <button
                  type="button"
                  className={`iz-roster-mini-btn${slot.noShowFlag ? " on" : ""}`}
                  onClick={() => onFlagNoShow(slot.id)}
                >
                  No-show
                </button>
              </>
            )}
            {slot.outletSwap?.status === "pending_pr" && (
              <button type="button" className="iz-roster-mini-btn" onClick={() => onCancelSwap(slot.id)}>
                Cancel
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function RosterShiftCard({
  slot,
  profile,
  canAssign,
  onEdit,
  onFlagLate,
  onFlagNoShow,
  onCancelSwap,
}: {
  slot: AgencyRosterSlot;
  profile?: AgencyManagedPR;
  canAssign: boolean;
  onEdit: (id: string) => void;
  onFlagLate: (id: string) => void;
  onFlagNoShow: (id: string) => void;
  onCancelSwap: (id: string) => void;
}) {
  return (
    <IzCard>
      <div className="iz-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <PrComcardIdentity
            pr={comcardPreviewFromSlot(slot, profile)}
            profile={profile}
            agencyName={rosterSlotAgencyName(slot)}
          />
          <div className="min-w-0">
            <div className="font-sora text-[15px] font-bold">{slot.prName}</div>
            <p className="iz-tiny iz-portal-table-meta mt-0.5">{rosterSlotAgencyName(slot)}</p>
            <p className="iz-tiny iz-muted2 mt-0.5">{slot.outlet}</p>
          </div>
        </div>
        <StatusPills slot={slot} />
      </div>
      <div className="iz-roster-card-meta mt-2">
        <span>{slot.shiftStart} – {slot.shiftEnd}</span>
        {slot.checkedInAt && <span>In {slot.checkedInAt}</span>}
        <span>{slot.floorDrinks ?? 0} drinks</span>
        <span className="text-[var(--iz-gold-l)]">{formatRM(slot.estPayout ?? 0)}</span>
      </div>
      {slot.outletSwap?.status === "pending_pr" && (
        <div className="mt-2 rounded-lg border border-[rgba(124,107,255,.3)] bg-[rgba(124,107,255,.08)] px-2.5 py-2">
          <p className="iz-tiny iz-muted flex items-center gap-1">
            <ArrowLeftRight className="h-3 w-3 text-[var(--iz-violet)]" />
            Swap to {slot.outletSwap.targetOutlet} — awaiting PR
          </p>
          <button
            type="button"
            className="iz-btn iz-btn-soft mt-2 w-full !py-1.5 !text-xs"
            onClick={() => onCancelSwap(slot.id)}
          >
            Cancel request
          </button>
        </div>
      )}
      {slot.status === "assignment-pending" && (
        <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2 py-1.5">
          Awaiting {slot.prName} to approve outlet assignment
        </p>
      )}
      {canAssign && (
        <div className="iz-roster-actions">
          {slot.status !== "swap-pending" && slot.status !== "assignment-pending" && (
            <button type="button" className="iz-btn iz-btn-soft iz-roster-action-btn" onClick={() => onEdit(slot.id)}>
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {!slot.checkedInAt && slot.status !== "unavailable" && slot.status !== "swap-pending" && (
            <>
              <button
                type="button"
                className={`iz-btn iz-roster-action-btn !text-xs ${slot.lateFlag ? "iz-btn-primary" : "iz-btn-ghost"}`}
                onClick={() => onFlagLate(slot.id)}
              >
                {slot.lateFlag ? "Late ✓" : "Late"}
              </button>
              <button
                type="button"
                className={`iz-btn iz-roster-action-btn !text-xs ${slot.noShowFlag ? "iz-btn-primary" : "iz-btn-ghost"}`}
                onClick={() => onFlagNoShow(slot.id)}
              >
                {slot.noShowFlag ? "No-show ✓" : "No-show"}
              </button>
            </>
          )}
        </div>
      )}
    </IzCard>
  );
}
