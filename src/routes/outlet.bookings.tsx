import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { AppTopbar } from "@/components/Nav";
import { IzSectionLabel } from "@/components/iz/ui";
import {
  DraftShiftEditor,
  DraftShiftSummary,
  buildLanguagesLabel,
  formatJobDate,
  newDraftShift,
  starTierToMinRating,
  type DraftShift,
} from "@/components/outlet/post-job-fields";
import { ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/outlet/bookings")({
  component: PostJobPage,
});

const PAY_PER_HOUR = 60;
const HOURS_PER_SHIFT = 6;

function shiftCost(quantity: number) {
  return quantity * PAY_PER_HOUR * HOURS_PER_SHIFT;
}

function PostJobPage() {
  const { createShifts } = useStore();

  const [composer, setComposer] = useState<DraftShift>(() => newDraftShift());
  const [draftShifts, setDraftShifts] = useState<DraftShift[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const addDraftShift = () => {
    const snapshot = newDraftShift({
      jobDate: composer.jobDate,
      event: composer.event,
      langs: [...composer.langs],
      otherLang: composer.otherLang,
      starTiers: [...composer.starTiers],
      shiftTime: composer.shiftTime,
      quantity: composer.quantity,
      prIds: [...composer.prIds],
    });
    setDraftShifts((cur) => [...cur, snapshot]);
    setEditingShiftId(null);
  };

  const updateDraftShift = (id: string, patch: Partial<DraftShift>) => {
    setDraftShifts((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeDraftShift = (id: string) => {
    setDraftShifts((cur) => cur.filter((s) => s.id !== id));
    if (editingShiftId === id) setEditingShiftId(null);
  };

  const sectionDate =
    draftShifts.length > 0 ? formatJobDate(draftShifts[0].jobDate) : formatJobDate(composer.jobDate);

  const totalHeadcount = draftShifts.reduce((sum, s) => sum + s.quantity, 0);
  const totalCost = draftShifts.reduce((sum, s) => sum + shiftCost(s.quantity), 0);

  const submitNew = () => {
    if (draftShifts.length === 0) return;
    createShifts(
      draftShifts.map((s) => ({
        outletName: "Velvet 23",
        date: formatJobDate(s.jobDate),
        shift: s.shiftTime,
        quantity: s.quantity,
        languages: buildLanguagesLabel(s.langs, s.otherLang),
        event: s.event,
        preferredRating: Math.min(...s.starTiers.map(starTierToMinRating)),
        preferredStarTiers: s.starTiers,
        estimatedCost: shiftCost(s.quantity),
        liveSales: 0,
        payPerHour: PAY_PER_HOUR,
        prs: s.prIds,
      })),
    );
    setComposer(newDraftShift());
    setDraftShifts([]);
    setEditingShiftId(null);
  };

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora text-xl font-extrabold text-[var(--iz-txt)]">
        Post shift · <span className="text-[var(--iz-gold-l)]">New job</span>
      </h2>

      <section className="pt-2">
        <p className="mt-2 text-[11px] text-[var(--iz-muted)]">
          Fill in shift details and select PRs for each slot, then add to your list. Edit any shift before posting.
        </p>

        <DraftShiftEditor
          shift={composer}
          onChange={(patch) => setComposer((c) => ({ ...c, ...patch }))}
          title="Shift details"
        />

        <button type="button" onClick={addDraftShift} className="iz-btn iz-btn-soft mt-2 w-full">
          <Plus className="h-4 w-4" />
          {draftShifts.length === 0 ? "Add shift" : "Add another shift"}
        </button>

        <div className="mt-4 flex items-center justify-between">
          <IzSectionLabel>Shifts for {sectionDate.toLowerCase()}</IzSectionLabel>
          <span className="text-[10px] text-[var(--iz-muted)]">
            {draftShifts.length} slot{draftShifts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {draftShifts.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center text-xs text-[var(--iz-muted)]">
            No shifts added yet. Configure details above, then tap Add shift.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {draftShifts.map((s, i) =>
              editingShiftId === s.id ? (
                <DraftShiftEditor
                  key={s.id}
                  shift={s}
                  onChange={(patch) => updateDraftShift(s.id, patch)}
                  onRemove={() => removeDraftShift(s.id)}
                  showRemove
                  title={`Shift ${i + 1}`}
                  onDone={() => setEditingShiftId(null)}
                />
              ) : (
                <DraftShiftSummary
                  key={s.id}
                  shift={s}
                  title={`Shift ${i + 1}`}
                  onEdit={() => setEditingShiftId(s.id)}
                  onRemove={() => removeDraftShift(s.id)}
                  showRemove
                />
              ),
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Total headcount" value={String(totalHeadcount)} />
          <Stat label="Estimated cost" value={`RM ${totalCost.toLocaleString()}`} valueClass="text-[var(--iz-gold)]" />
        </div>

        <button
          type="button"
          onClick={submitNew}
          disabled={draftShifts.length === 0}
          className="iz-btn iz-btn-primary mt-3 disabled:opacity-40"
        >
          Post{draftShifts.length > 0 ? ` ${draftShifts.length}` : ""} shift{draftShifts.length !== 1 ? "s" : ""}{" "}
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="iz-stat-tile">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">{label}</div>
      <div className={`font-sora mt-1.5 text-xl font-extrabold ${valueClass || "text-[var(--iz-txt)]"}`}>{value}</div>
    </div>
  );
}
