import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { LogOut, Shield, Star, Languages, IdCard } from "lucide-react";

export const Route = createFileRoute("/host/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useStore();
  return (
    <div>
      <AppHeader subtitle="InnocenZ · Host" title="Profile" />
      <div className="px-5 pt-5">
        <div className="flex flex-col items-center rounded-3xl bg-gradient-surface p-6 shadow-card">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-3xl shadow-glow">
            {(user?.name ?? "A")[0].toUpperCase()}
          </div>
          <div className="mt-3 text-lg font-display font-semibold">{user?.name ?? "Host"}</div>
          <div className="text-[11px] text-muted-foreground">{user?.email ?? "guest@innocenz.app"}</div>
          <div className="mt-3 flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-gold"><Star className="h-3 w-3 fill-gold" /> 4.8</span>
            <span className="flex items-center gap-1 text-success"><Shield className="h-3 w-3" /> Verified</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
          <Row icon={<IdCard className="h-4 w-4" />} label="IC verified" value="••• 4421" />
          <Row icon={<Languages className="h-4 w-4" />} label="Languages" value="EN · 中文" />
          <Row icon={<Shield className="h-4 w-4" />} label="Agency" value="Velvet Talent" />
        </div>

        <button onClick={() => { signOut(); navigate({ to: "/" }); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 py-3 text-sm text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
