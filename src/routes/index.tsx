import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { iconForNav } from "@/lib/lucide-label-icons";
import { useStore, type Role } from "@/lib/store";
import type { SignInPortal } from "@/lib/portal-signin";
import { PhoneFrame, InnocenZLogoMark } from "@/components/Brand";
import { TitleWithIcon } from "@/components/iz/TitleWithIcon";

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
  title: string;
}[] = [
  { side: "outlet", role: "vendor", title: "Outlet" },
  { side: "agency", role: "agency", title: "PR Agency" },
  { side: "pr", role: "host", title: "PR" },
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
        <InnocenZLogoMark className="!mt-[26px]" />

        <div className="text-center">
          <h1 className="font-sora mt-3 text-[27px] font-extrabold text-[var(--iz-txt)]">
            <TitleWithIcon icon={iconForNav("Welcome")}>
              Welcome to Innocen<span className="iz-wordmark-z">Z</span>
            </TitleWithIcon>
          </h1>
        </div>

        <div className="iz-role-grid">
          {ROLES.map((r) => {
            const RoleIcon = iconForNav(r.title);
            return (
              <Link
                key={r.side}
                to="/signin"
                search={{ mode: "signin", portal: r.side }}
                className="iz-role-card block w-full text-left no-underline"
                onClick={() => preparePortal(r.side)}
              >
                <div className="iz-role-icon">
                  <RoleIcon className="h-[21px] w-[21px]" strokeWidth={1.8} />
                </div>
                <span className="iz-role-arrow">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <h4>{r.title}</h4>
              </Link>
            );
          })}
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
