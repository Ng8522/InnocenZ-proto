import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { LiveWorkforceEntry } from "@/lib/agency-demo";
import { deriveLiveWorkforce, outletMatches } from "@/lib/portal-sync";
import { formatPrDisplayName } from "@/lib/pr-demo";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { useStore } from "@/lib/store";
import { IzPill } from "@/components/iz/ui";
import { ChevronRight } from "lucide-react";

export function workforceStatusVariant(status: LiveWorkforceEntry["status"] | "scheduled") {
  if (status === "on-duty") return "green" as const;
  if (status === "en-route") return "violet" as const;
  if (status === "scheduled") return "amber" as const;
  return "ink" as const;
}

export function workforceStatusLabel(status: LiveWorkforceEntry["status"] | "scheduled") {
  if (status === "on-duty") return "ON-DUTY";
  if (status === "en-route") return "EN-ROUTE";
  if (status === "scheduled") return "BOOKED";
  return "OUT";
}

function statusVariant(status: LiveWorkforceEntry["status"]) {
  return workforceStatusVariant(status);
}

function statusLabel(status: LiveWorkforceEntry["status"]) {
  return workforceStatusLabel(status);
}

function WorkforceRow({
  entry,
  shift,
}: {
  entry: LiveWorkforceEntry;
  shift?: string;
}) {
  const initials = entry.prName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr>
      <td>
        <div className="iz-portal-table-pr">
          <span className="iz-portal-table-av">{initials}</span>
          <span className="font-sora text-sm font-semibold">{entry.prName}</span>
        </div>
      </td>
      <td className="iz-muted">{entry.outlet}</td>
      <td className="iz-muted iz-portal-table-shift">{shift ?? "—"}</td>
      <td>
        <IzPill variant={statusVariant(entry.status)} className="!py-0.5 !text-[9px]">
          {statusLabel(entry.status)}
        </IzPill>
      </td>
    </tr>
  );
}

export function LiveWorkforceTable({
  dateIso = DEFAULT_ROSTER_DATE_ISO,
  rosterLink = "/agency/roster",
  title = "Live workforce",
  outletFilter,
}: {
  dateIso?: string;
  rosterLink?: string;
  title?: string;
  outletFilter?: string;
}) {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);
  const workforce = useMemo(
    () => deriveLiveWorkforce(agencyRoster, dateIso, outletCommissionRules, perDrinkRm),
    [agencyRoster, dateIso, outletCommissionRules, perDrinkRm],
  );
  const filtered = outletFilter
    ? workforce.filter((w) => w.outlet === outletFilter || w.outlet.includes(outletFilter))
    : workforce;

  const shiftById = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of agencyRoster) {
      if (slot.id) map.set(slot.id, slot.shift);
    }
    return map;
  }, [agencyRoster]);

  if (filtered.length === 0) {
    return (
      <section className="iz-portal-panel">
        <div className="iz-portal-panel-head">
          <h3 className="font-sora text-base font-bold">{title}</h3>
        </div>
        <p className="iz-tiny iz-muted px-4 py-6 text-center">No PRs on floor right now.</p>
      </section>
    );
  }

  return (
    <section className="iz-portal-panel">
      <div className="iz-portal-panel-head">
        <h3 className="font-sora text-base font-bold">{title}</h3>
        <Link to={rosterLink} className="iz-tiny flex items-center gap-0.5 text-[var(--iz-gold-l)]">
          Full roster <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="iz-portal-table-wrap">
        <table className="iz-portal-table">
          <thead>
            <tr>
              <th>PR</th>
              <th>Outlet</th>
              <th>Shift</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <WorkforceRow key={w.id} entry={w} shift={shiftById.get(w.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Compact card list for outlet portal mobile/desktop */
export function LiveWorkforceList({
  dateIso = DEFAULT_ROSTER_DATE_ISO,
  outletName,
}: {
  dateIso?: string;
  outletName: string;
}) {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const shifts = useStore((s) => s.shifts);
  const prs = useStore((s) => s.prs);
  const syncLivePrCheckInToRoster = useStore((s) => s.syncLivePrCheckInToRoster);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);

  useEffect(() => {
    syncLivePrCheckInToRoster();
  }, [syncLivePrCheckInToRoster, agencyRoster.length]);

  const tonightShift =
    shifts.find((s) => s.date === "Tonight" && outletMatches(s.outletName, outletName)) ??
    shifts.find((s) => outletMatches(s.outletName, outletName));

  const rosterTonight = useMemo(
    () => agencyRoster.filter((s) => s.dateIso === dateIso && outletMatches(s.outlet, outletName)),
    [agencyRoster, dateIso, outletName],
  );

  const rows = useMemo(() => {
    const bookedIds = tonightShift?.prs ?? [];
    const seen = new Set<string>();
    const list: { id: string; prName: string; status: LiveWorkforceEntry["status"] | "scheduled" }[] = [];

    for (const prId of bookedIds) {
      if (seen.has(prId)) continue;
      seen.add(prId);
      const slot = rosterTonight.find((s) => s.prId === prId);
      const pr = prs.find((p) => p.id === prId);
      const status =
        slot?.status === "on-duty" && slot.checkedInAt
          ? "on-duty"
          : slot?.status === "en-route"
            ? "en-route"
            : ("scheduled" as const);
      list.push({
        id: slot?.id ?? prId,
        prName: formatPrDisplayName(prId, slot?.prName ?? pr?.name),
        status,
      });
    }

    if (list.length > 0) {
      return list.sort((a, b) => {
        const rank = (s: typeof a.status) =>
          s === "on-duty" ? 0 : s === "en-route" ? 1 : 2;
        return rank(a.status) - rank(b.status);
      });
    }

    return deriveLiveWorkforce(agencyRoster, dateIso, outletCommissionRules, perDrinkRm)
      .filter((w) => outletMatches(w.outlet, outletName))
      .map((w) => ({
        id: w.id,
        prName: formatPrDisplayName(
          agencyRoster.find((s) => s.id === w.id)?.prId ?? w.id,
          w.prName,
        ),
        status: w.status,
      }));
  }, [tonightShift?.prs, rosterTonight, prs, agencyRoster, dateIso, outletCommissionRules, perDrinkRm, outletName]);

  const onFloorCount = rows.filter((r) => r.status === "on-duty" || r.status === "en-route").length;

  return (
    <section className="iz-portal-panel">
      <div className="iz-portal-panel-head">
        <h3 className="font-sora text-base font-bold">PR roster — tonight</h3>
        <span className="iz-tiny iz-muted">
          {onFloorCount} on floor · {rows.length} booked
        </span>
      </div>
      <ul className="iz-portal-roster-list">
        {rows.map((w) => (
          <li key={w.id} className="iz-portal-roster-row">
            <span className="iz-portal-table-av">{w.prName.trim()[0]}</span>
            <span className="min-w-0 flex-1 truncate font-sora text-sm font-semibold">{w.prName}</span>
            <IzPill variant={statusVariant(w.status)} className="!py-0.5 !text-[9px]">
              {statusLabel(w.status)}
            </IzPill>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="iz-tiny iz-muted px-4 py-5 text-center">No PRs booked yet.</li>
        )}
      </ul>
    </section>
  );
}
