import { useEffect, useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import {
  type ShiftHistoryRow,
  shiftHistorySubline,
} from "@/lib/shift-history";
import { IzCard, formatRM } from "@/components/iz/ui";
import type { ReactNode } from "react";
import { Calendar, ChevronDown } from "lucide-react";

type Portal = "agency" | "outlet";

export function ShiftHistoryLog({
  portal,
  rows,
}: {
  portal: Portal;
  rows: ShiftHistoryRow[];
}) {
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [thirdFilter, setThirdFilter] = useState("");

  const prNames = useMemo(() => [...new Set(rows.map((r) => r.prName))].sort(), [rows]);
  const dates = useMemo(() => [...new Set(rows.map((r) => r.dateIso))].sort().reverse(), [rows]);
  const thirdOptions = useMemo(() => {
    if (portal === "agency") {
      return [...new Set(rows.map((r) => r.outlet))].sort();
    }
    return [...new Set(rows.map((r) => r.agencyName))].sort();
  }, [rows, portal]);

  const filtered = rows.filter((r) => {
    if (nameFilter && r.prId !== nameFilter) return false;
    if (dateFilter && r.dateIso !== dateFilter) return false;
    if (thirdFilter) {
      if (portal === "agency" && r.outlet !== thirdFilter) return false;
      if (portal === "outlet" && r.agencyName !== thirdFilter) return false;
    }
    return true;
  });

  const subtitle =
    portal === "agency"
      ? "Transaction log for completed shifts — payout, drinks, and tips per PR"
      : "Transaction log for completed shifts — payout, drinks, and tips per PR";

  const thirdLabel = portal === "agency" ? "OUTLET" : "PR AGENCY";

  return (
    <div className="iz-screen">
      <AppTopbar showDateTime={portal === "agency"} />
      <p className="iz-tiny iz-muted2 uppercase tracking-widest">InnocenZ · {portal === "agency" ? "Agency" : "Outlet"}</p>
      <h2 className="font-sora mx-0.5 mt-0.5 text-[22px] font-extrabold text-[var(--iz-txt)]">History</h2>
      <p className="iz-tiny iz-muted mt-0.5">{subtitle}</p>

      <p className="iz-txn-filter-heading mt-4">Filter by</p>
      <div className="iz-txn-filters">
        <HistSelectField
          label="NAME"
          value={nameFilter}
          onChange={setNameFilter}
          options={[
            { value: "", label: "All names" },
            ...prNames.map((n) => {
              const row = rows.find((r) => r.prName === n);
              return { value: row?.prId ?? n, label: n };
            }),
          ]}
        />
        <HistSelectField
          label="DATE"
          value={dateFilter}
          onChange={setDateFilter}
          icon={<Calendar className="h-3.5 w-3.5 text-[var(--iz-gold-l)]" />}
          options={[
            { value: "", label: "All dates" },
            ...dates.map((d) => {
              const row = rows.find((r) => r.dateIso === d);
              return { value: d, label: row?.dateDisplay ?? d };
            }),
          ]}
        />
        <HistSelectField
          label={thirdLabel}
          value={thirdFilter}
          onChange={setThirdFilter}
          options={[
            { value: "", label: portal === "agency" ? "All outlets" : "All agencies" },
            ...thirdOptions.map((o) => ({ value: o, label: o })),
          ]}
        />
      </div>

      <div className="iz-between mt-4">
        <div className="iz-sect-label !mb-0">Transaction log</div>
        <span className="iz-tiny iz-muted2">{filtered.length} records</span>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {filtered.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No records match these filters</p>
          </IzCard>
        ) : (
          filtered.map((row) => (
            <TxnCard key={row.id} row={row} portal={portal} />
          ))
        )}
      </div>
    </div>
  );
}

function TxnCard({ row, portal }: { row: ShiftHistoryRow; portal: Portal }) {
  return (
    <IzCard>
      <div className="iz-between items-start gap-2">
        <div className="font-sora text-[16px] font-bold">{row.prName}</div>
        <div className="shrink-0 font-sora text-sm font-bold text-[var(--iz-gold-l)]">{row.dateDisplay}</div>
      </div>
      <p className="iz-tiny iz-muted mt-0.5">{shiftHistorySubline(row, portal)}</p>
      <div className="iz-txn-card-metrics">
        <div className="iz-txn-metric payout">
          <div className="label">Total payout</div>
          <div className="value iz-ledger">{formatRM(row.totalPayout)}</div>
        </div>
        <div className="iz-txn-metric">
          <div className="label">Total drinks</div>
          <div className="value">{row.totalDrinks}</div>
        </div>
        <div className="iz-txn-metric">
          <div className="label">Total tips</div>
          <div className="value iz-ledger">{formatRM(row.totalTips)}</div>
        </div>
      </div>
    </IzCard>
  );
}

function HistSelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "Any";

  return (
    <div ref={rootRef} className="iz-hist-custom-select compact">
      <label>{label}</label>
      <button
        type="button"
        className={`iz-hist-select-trigger sm${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`flex min-w-0 items-center gap-1.5 truncate${value ? "" : " iz-muted2"}`}>
          {icon}
          <span className="truncate">{current}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="iz-hist-select-menu" role="listbox">
          {options.map((opt) => (
            <li key={opt.value || "__any"}>
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={value === opt.value ? "sel" : undefined}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
