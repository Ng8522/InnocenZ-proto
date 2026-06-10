import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzCard } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";

export const Route = createFileRoute("/outlet/workspace")({
  component: OutletWorkspacePage,
});

function TimeField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm font-semibold outline-none"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
  readOnly,
}: {
  label: string;
  value: number | string;
  onChange?: (n: number) => void;
  suffix?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const commit = () => {
    if (!onChange) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
        {suffix === "RM" && <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          readOnly={readOnly}
          onChange={(e) => !readOnly && setText(e.target.value.replace(/[^\d.:]/g, ""))}
          onBlur={commit}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none"
        />
        {suffix && suffix !== "RM" && <span className="text-[11px] text-[var(--iz-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function OutletWorkspacePage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { outletWorkspace, saveOutletWorkspace } = useStore();
  const canEdit = outletCan(outletSubRole, "manageWorkspace");
  const [draft, setDraft] = useState(outletWorkspace);

  const patch = (p: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/outlet" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Workspace</h2>
        <p className="iz-tiny iz-muted mt-0.5">Rates for new shifts · {draft.outletName}</p>
        {!canEdit && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Read-only (Finance)
          </p>
        )}
      </header>

      <OutletSection title="Base rates" hint={`RM ${draft.basePayPerHour}/hr`} className="!mt-4">
      <IzCard className="!py-3">
        <div className="flex gap-3">
          <NumField
            label="Pay / hour"
            value={draft.basePayPerHour}
            suffix="RM"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ basePayPerHour: n }) : undefined}
          />
          <NumField
            label="OT after"
            value={draft.otAfterHours}
            suffix="hrs"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ otAfterHours: n }) : undefined}
          />
        </div>
      </IzCard>
      </OutletSection>

      <OutletSection title="Commission" hint={`${draft.drinkPct}% drink · ${draft.tipPct}% tip`} collapsible defaultOpen={false}>
      <IzCard className="!py-3">
        <div className="grid grid-cols-3 gap-2">
          <NumField
            label="Drink %"
            value={draft.drinkPct}
            suffix="%"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ drinkPct: n }) : undefined}
          />
          <NumField
            label="Tip %"
            value={draft.tipPct}
            suffix="%"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ tipPct: n }) : undefined}
          />
          <NumField
            label="Table %"
            value={draft.tablePct}
            suffix="%"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ tablePct: n }) : undefined}
          />
        </div>
      </IzCard>
      </OutletSection>

      <OutletSection title="Sale units" hint={`RM ${draft.perDrinkRm} drink · RM ${draft.perTableRm} table`}>
      <IzCard className="!py-3">
        <div className="flex gap-3">
          <NumField
            label="Per drink"
            value={draft.perDrinkRm}
            suffix="RM"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ perDrinkRm: n }) : undefined}
          />
          <NumField
            label="Per table"
            value={draft.perTableRm}
            suffix="RM"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ perTableRm: n }) : undefined}
          />
        </div>
      </IzCard>
      </OutletSection>

      <OutletSection title="Happy hour" hint={`${draft.happyHourStart}–${draft.happyHourEnd}`} collapsible defaultOpen={false}>
      <IzCard className="!py-3">
        <div className="flex gap-3">
          <TimeField
            label="Start"
            value={draft.happyHourStart}
            readOnly={!canEdit}
            onChange={canEdit ? (v) => patch({ happyHourStart: v }) : undefined}
          />
          <TimeField
            label="End"
            value={draft.happyHourEnd}
            readOnly={!canEdit}
            onChange={canEdit ? (v) => patch({ happyHourEnd: v }) : undefined}
          />
        </div>
        <div className="mt-2">
          <NumField
            label="Drink boost"
            value={draft.happyHourDrinkBoost}
            suffix="×"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ happyHourDrinkBoost: n }) : undefined}
          />
        </div>
      </IzCard>
      </OutletSection>

      {canEdit && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-5"
          onClick={() => saveOutletWorkspace(draft)}
        >
          Save workspace
        </button>
      )}
    </div>
  );
}
