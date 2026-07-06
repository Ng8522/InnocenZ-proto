import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Users, Star, ArrowRight, RotateCcw } from "lucide-react";
import { useStore, type Role } from "@/lib/store";
import type { SignInPortal } from "@/lib/portal-signin";
import { PhoneFrame, InnocenZLogoMark } from "@/components/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InnocenZ — Nightlife, Powered by Trust" },
      {
        name: "description",
        content: "InnocenZ connects outlets, agencies, PR and guests in one platform.",
      },
    ],
  }),
  component: Welcome,
});

const ROLES: {
  side: SignInPortal;
  role: Role;
  icon: typeof Building2;
  title: string;
}[] = [
  { side: "outlet", role: "vendor", icon: Building2, title: "Outlet" },
  { side: "agency", role: "agency", icon: Users, title: "PR Agency" },
  { side: "pr", role: "host", icon: Star, title: "PR" },
];

function Welcome() {
  const setRole = useStore((s) => s.setRole);
  const setPrSubRole = useStore((s) => s.setPrSubRole);
  const setOutletSubRole = useStore((s) => s.setOutletSubRole);
  const setAgencySubRole = useStore((s) => s.setAgencySubRole);
  const resetDemo = useStore((s) => s.resetDemo);
  const toast = useStore((s) => s.toast);

  const handleResetDemo = () => {
    resetDemo();
    toast("All demo data reset — Outlet, Agency & PR", "success");
  };

  const preparePortal = (side: SignInPortal) => {
    if (side === "pr") {
      setRole("host");
      setPrSubRole("pr_tied");
      setOutletSubRole(null);
      setAgencySubRole(null);
      return;
    }
    if (side === "outlet") {
      setRole("vendor");
      setPrSubRole(null);
      setAgencySubRole(null);
      return;
    }
    setRole("agency");
    setPrSubRole(null);
    setOutletSubRole(null);
  };

  return (
    <PhoneFrame showStatusBar>
      <div className="iz-welcome">
        <div className="iz-wordmark mt-1.5">
          Innocen<span className="iz-wordmark-z">Z</span>
        </div>

        <InnocenZLogoMark size="lg" className="!mt-[26px]" />

        <div className="text-center">
          <h1 className="font-sora mt-3 text-[27px] font-extrabold text-[var(--iz-txt)]">
            Welcome to Innocen<span className="iz-wordmark-z">Z</span>
          </h1>
        </div>

        <div className="iz-role-grid">
          {ROLES.map((r) => (
            <Link
              key={r.side}
              to="/signin"
              search={{ portal: r.side }}
              className="iz-role-card block w-full text-left no-underline"
              onClick={() => preparePortal(r.side)}
            >
              <div className="iz-role-icon">
                <r.icon className="h-[21px] w-[21px]" strokeWidth={1.8} />
              </div>
              <span className="iz-role-arrow">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <h4>{r.title}</h4>
            </Link>
          ))}
        </div>

        <div className="mt-3.5 flex flex-col items-center gap-2">
          <button
            type="button"
            className="iz-chip inline-flex !border-[var(--iz-red)]/35 !text-[var(--iz-red)]"
            onClick={handleResetDemo}
          >
            <RotateCcw className="h-3 w-3" /> Reset all demo data
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
