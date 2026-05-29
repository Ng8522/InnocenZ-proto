import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Store, GlassWater, Building2, ArrowRight } from "lucide-react";
import { useStore, type Role } from "@/lib/store";
import { Logo, PhoneFrame } from "@/components/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InnocenZ — Connect. Engage. Entertain." },
      {
        name: "description",
        content: "InnocenZ connects outlets, agencies, PR talent and guests in one platform.",
      },
    ],
  }),
  component: Welcome,
});

const ROLES: { id: Role; icon: typeof Users; title: string; desc: string; wide?: boolean }[] = [
  { id: "host", icon: GlassWater, title: "PR Personnel", desc: "Shifts · check-in · wallet · PV · SOS." },
  { id: "agency", icon: Building2, title: "PR Agency", desc: "Approve PRs · roster · payroll · PV." },
  { id: "vendor", icon: Store, title: "Outlet", desc: "Request manpower · track sales · seal shifts.", wide: true },
];

function rolePath(role: Role) {
  if (role === "vendor") return "/outlet";
  if (role === "host") return "/host";
  if (role === "agency") return "/agency";
  if (role === "admin") return "/admin";
  return "/host";
}

function Welcome() {
  const navigate = useNavigate();
  const setRole = useStore((s) => s.setRole);
  const [picked, setPicked] = useState<Role>("host");

  const go = () => {
    setRole(picked);
    navigate({ to: rolePath(picked) });
  };

  return (
    <PhoneFrame className="px-6 pb-8 pt-10">
      <div className="flex items-center justify-between">
        <span />
        <button onClick={go} className="glass rounded-full px-4 py-1.5 text-xs font-medium">
          Skip
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <Logo size="lg" />
      </div>

      <div className="mt-10">
        <h1 className="text-3xl font-display font-semibold leading-tight">
          Welcome to <span className="text-gradient-primary">InnocenZ</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose your role to personalize your experience.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const active = picked === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setPicked(r.id)}
              className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                r.wide ? "col-span-2 mx-auto w-[calc(50%-6px)]" : ""
              } ${
                active
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-surface/60 hover:border-primary/50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-gradient-primary" : "bg-surface-elevated"}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{r.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={go}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-4 font-semibold shadow-glow transition active:scale-[0.98]"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate({ to: "/signin" })} className="rounded-full border border-border bg-surface/60 py-3 text-sm font-medium">
            Sign In
          </button>
          <button
            onClick={() => navigate({ to: "/signin", search: { mode: "create" } as never })}
            className="rounded-full border border-border bg-surface/60 py-3 text-sm font-medium"
          >
            Create Account
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          UAB Admin uses a{" "}
          <Link to="/admin" className="text-primary underline-offset-2 hover:underline">
            separate portal
          </Link>{" "}
          (not on public login).
        </p>
      </div>
    </PhoneFrame>
  );
}
