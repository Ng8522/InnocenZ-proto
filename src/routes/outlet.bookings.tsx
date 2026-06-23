import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useMemo, useState } from "react";

import { useStore } from "@/lib/store";

import { AppTopbar } from "@/components/Nav";

import { IzSectionLabel } from "@/components/iz/ui";

import { OutletServicePostSection } from "@/components/outlet/outlet-service-post";

import {

  DraftShiftEditor,

  DraftShiftSummary,

  buildLanguagesLabel,

  draftTierRatesFromWorkspace,

  estimateDraftShiftCost,
  formatJobDate,
  isoFromJobDate,
  languagesForPrIds,
  newDraftShift,
  starTierToMinRating,

  type DraftShift,

} from "@/components/outlet/post-job-fields";

import { outletCan } from "@/lib/outlet-rbac";

import { cn } from "@/lib/utils";

import { ChevronRight, Plus, Sparkles } from "lucide-react";



type PostJobTab = "shifts" | "services";



export const Route = createFileRoute("/outlet/bookings")({

  validateSearch: (search: Record<string, unknown>): { tab?: PostJobTab } => ({

    tab: search.tab === "services" ? "services" : "shifts",

  }),

  component: PostJobPage,

});



function PostJobPage() {

  const navigate = useNavigate({ from: Route.fullPath });

  const { tab: searchTab } = Route.useSearch();

  const outletSubRole = useStore((s) => s.outletSubRole);

  const canPostShifts = outletCan(outletSubRole, "postJob");

  const canOrderServices = outletCan(outletSubRole, "orderSpecialService");

  const tab: PostJobTab = useMemo(() => {

    if (searchTab === "services" && canOrderServices) return "services";

    if (searchTab === "shifts" && canPostShifts) return "shifts";

    if (canPostShifts) return "shifts";

    return "services";

  }, [searchTab, canPostShifts, canOrderServices]);



  const setTab = (next: PostJobTab) => {

    navigate({ search: { tab: next } });

  };



  const { createShifts, outletWorkspace, agencyPRs } = useStore();



  const prTierById = useMemo(

    () => Object.fromEntries(agencyPRs.map((p) => [p.id, p.trainingLevel])),

    [agencyPRs],

  );



  const [composer, setComposer] = useState<DraftShift>(() =>

    newDraftShift(undefined, outletWorkspace),

  );

  const [draftShifts, setDraftShifts] = useState<DraftShift[]>([]);

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);



  const addDraftShift = () => {

    const snapshot = newDraftShift({

      jobDate: composer.jobDate,

      event: composer.event,

      eventKind: composer.eventKind,

      specialEventType: composer.specialEventType,

      eventDrinkMenu:

        composer.eventKind === "special"

          ? composer.eventDrinkMenu?.map((d) => ({ ...d }))

          : undefined,

      langs: [...composer.langs],

      otherLang: composer.otherLang,

      starTiers: [...composer.starTiers],

      shiftTime: composer.shiftTime,

      quantity: composer.quantity,

      prIds: [...composer.prIds],

      payPerHour: composer.payPerHour,

      tierRates: composer.tierRates,

      dressCode: composer.dressCode,

      destination: composer.destination,

    });

    setDraftShifts((cur) => [...cur, snapshot]);

    setComposer((c) => ({

      ...c,

      tierRates: draftTierRatesFromWorkspace(outletWorkspace),

      payPerHour: outletWorkspace.tierRates["Tier I"].wagePerHour,

    }));

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

  const totalCost = draftShifts.reduce(

    (sum, s) => sum + estimateDraftShiftCost(s, prTierById),

    0,

  );



  const submitNew = () => {

    if (draftShifts.length === 0) return;

    createShifts(

      draftShifts.map((s) => ({

        outletName: "Velvet 23",

        date: formatJobDate(s.jobDate),

        dateIso: isoFromJobDate(s.jobDate),

        shift: s.shiftTime,

        quantity: s.quantity,

        languages: buildLanguagesLabel(
          s.langs.length > 0 ? s.langs : languagesForPrIds(s.prIds, agencyPRs),
          s.otherLang,
        ),

        event: s.event,

        eventKind: s.eventKind,

        specialEventType: s.eventKind === "special" ? s.specialEventType : undefined,

        eventDrinkMenu:
          s.eventKind === "special" ? s.eventDrinkMenu?.map((d) => ({ ...d })) : undefined,

        preferredRating: Math.min(...s.starTiers.map(starTierToMinRating)),

        preferredStarTiers: s.starTiers,

        estimatedCost: estimateDraftShiftCost(s, prTierById),

        liveSales: 0,

        payPerHour: s.tierRates["Tier I"].wagePerHour,

        tierRates: s.tierRates,

        dressCode: s.dressCode,

        destination: s.destination,

        prs: s.prIds,

      })),

    );

    setComposer(newDraftShift(undefined, outletWorkspace));

    setDraftShifts([]);

    setEditingShiftId(null);

  };



  const showTabs = canPostShifts && canOrderServices;



  if (!canPostShifts && !canOrderServices) {

    return (

      <div className="iz-screen">

        <header className="pt-1">

          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>

        </header>

        <p className="iz-tiny iz-muted mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">

          Your outlet role cannot post shifts or order services.

        </p>

      </div>

    );

  }



  return (

    <div className="iz-screen">

      {editingShiftId && tab === "shifts" && (

        <AppTopbar onBack={() => setEditingShiftId(null)} backLabel="Shift list" />

      )}

      <header className="pt-1">

        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Post Job</h2>

        <p className="iz-tiny iz-muted mt-0.5">

          {tab === "shifts"

            ? "Add shifts to your list, then post when ready."

            : `${outletWorkspace.outletName} · agency add-ons`}

        </p>

      </header>



      {showTabs && (

        <div className="mt-3 flex gap-1 rounded-xl border border-[var(--iz-line)] bg-white/[0.02] p-1">

          <button

            type="button"

            onClick={() => setTab("shifts")}

            className={cn(

              "iz-btn iz-btn-sm min-w-0 flex-1 !py-2 !text-xs",

              tab === "shifts" ? "iz-btn-primary" : "iz-btn-ghost",

            )}

          >

            <Plus className="h-3.5 w-3.5" /> Shifts

          </button>

          <button

            type="button"

            onClick={() => setTab("services")}

            className={cn(

              "iz-btn iz-btn-sm min-w-0 flex-1 !py-2 !text-xs",

              tab === "services" ? "iz-btn-primary" : "iz-btn-ghost",

            )}

          >

            <Sparkles className="h-3.5 w-3.5" /> Services

          </button>

        </div>

      )}



      {tab === "shifts" && canPostShifts ? (

        <section className="pt-3">

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

      ) : canOrderServices ? (

        <OutletServicePostSection />

      ) : null}

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
