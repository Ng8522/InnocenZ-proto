import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Check, X, ShieldCheck, Activity, FileSearch } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});

const seedApprovals = [
  { id: "a1", name: "Hana K.", type: "PR Personnel", note: "Freelancer · EN/中文" },
  { id: "a2", name: "Skybar KL", type: "Outlet", note: "Bukit Bintang · pending SSM" },
  { id: "a3", name: "Aria Talent", type: "Agency", note: "12 PRs · Klang Valley" },
];

function AdminPanel() {
  const navigate = useNavigate();
  const { toast, shifts, pvs } = useStore();
  const [queue, setQueue] = useState(seedApprovals);

  const decide = (id: string, approve: boolean) => {
    const item = queue.find((q) => q.id === id);
    setQueue(queue.filter((q) => q.id !== id));
    if (item) toast(`${approve ? "Approved" : "Rejected"}: ${item.name}`, approve ? "success" : "warn");
  };

  return (
    <PhoneFrame>
      <Toasts />
      <AppHeader subtitle="InnocenZ · Admin" title="Control Panel" right={
        <button onClick={() => navigate({ to: "/" })} className="text-[11px] text-muted-foreground">Switch</button>
      } />
      <main className="flex-1 px-5 pt-5 pb-8">
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<ShieldCheck className="h-4 w-4" />} label="Pending" value={String(queue.length)} />
          <Tile icon={<Activity className="h-4 w-4" />} label="Live shifts" value={String(shifts.length)} />
          <Tile icon={<FileSearch className="h-4 w-4" />} label="PVs" value={String(pvs.length)} />
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Approval queue</h3>
        <div className="space-y-2">
          {queue.length === 0 && <div className="rounded-2xl bg-gradient-surface p-6 text-center text-sm text-muted-foreground shadow-card">Queue clear · nice work.</div>}
          {queue.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-2xl bg-gradient-surface p-3 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-xs">{q.type[0]}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{q.name}</div>
                <div className="text-[11px] text-muted-foreground">{q.type} · {q.note}</div>
              </div>
              <button onClick={() => decide(q.id, false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/40 text-destructive"><X className="h-3.5 w-3.5" /></button>
              <button onClick={() => decide(q.id, true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary"><Check className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Audit log</h3>
        <div className="rounded-2xl bg-gradient-surface p-4 text-[11px] font-mono shadow-card space-y-1.5">
          <div><span className="text-success">[OK]</span> escrow_split atomic · sum=0.00000</div>
          <div><span className="text-success">[OK]</span> pv.signed pv1 · wallet+RM519</div>
          <div><span className="text-warning">[!]</span> outlet.payment_pending INV-0042</div>
          <div><span className="text-success">[OK]</span> shift.confirmed s1 · 6/6 PRs</div>
        </div>
      </main>
    </PhoneFrame>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gradient-surface p-3 shadow-card">
      <span className="text-primary">{icon}</span>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
