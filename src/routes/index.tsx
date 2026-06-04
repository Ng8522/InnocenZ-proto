import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Users, Star, Shield, ArrowRight } from "lucide-react";
import { useStore, type Role } from "@/lib/store";
import type { PrSubRole } from "@/lib/pr-demo";
import { PhoneFrame } from "@/components/Brand";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard } from "@/components/iz/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InnocenZ ? Nightlife, Powered by Trust" },
      {
        name: "description",
        content: "InnocenZ connects outlets, agencies, PR and guests in one platform.",
      },
    ],
  }),
  component: Welcome,
});

type Side = "outlet" | "agency" | "pr";

const ROLES: { side: Side; role: Role; icon: typeof Building2; title: string; desc: string }[] = [
  { side: "outlet", role: "vendor", icon: Building2, title: "Outlet", desc: "Book PR. Run the floor." },
  { side: "agency", role: "agency", icon: Users, title: "PR Agency", desc: "Roster, deploy, settle." },
  { side: "pr", role: "host", icon: Star, title: "PR", desc: "Shifts, earnings, safety." },
];

const SUB_ROLES: Record<
  Side,
  { title: string; items: { label: string; desc: string; role: Role; path: string; prSubRole?: PrSubRole }[] }
> = {
  outlet: {
    title: "Outlet sub-role",
    items: [
      { label: "Owner", desc: "Full venue access ? jobs, floor, billing", role: "vendor", path: "/outlet" },
      { label: "Finance", desc: "Billing & spend reports only", role: "vendor", path: "/outlet" },
      { label: "Operations Head", desc: "Shifts, floor & sealing", role: "vendor", path: "/outlet" },
    ],
  },
  agency: {
    title: "Agency sub-role",
    items: [
      { label: "Owner", desc: "Full dashboard, roster & approvals", role: "agency", path: "/agency" },
      { label: "Finance", desc: "Payroll, PV & collections only", role: "agency", path: "/agency" },
    ],
  },
  pr: {
    title: "PR type",
    items: [
      { label: "Agency-Tied", desc: "Shifts may need agency approval", role: "host", path: "/host", prSubRole: "pr_tied" },
      { label: "Freelancer", desc: "Accept shifts independently — appoint any agency for payroll", role: "host", path: "/host", prSubRole: "pr_free" },
    ],
  },
};

function Welcome() {
  const navigate = useNavigate();
  const setRole = useStore((s) => s.setRole);
  const setPrSubRole = useStore((s) => s.setPrSubRole);
  const resetPrShift = useStore((s) => s.resetPrShift);
  const [sheetSide, setSheetSide] = useState<Side | null>(null);

  const enter = (role: Role, path: string, prSubRole?: PrSubRole) => {
    setRole(role);
    setPrSubRole(prSubRole ?? null);
    if (role === "host") resetPrShift();
    setSheetSide(null);
    navigate({ to: path });
  };

  const sheet = sheetSide ? SUB_ROLES[sheetSide] : null;

  return (
    <PhoneFrame
      showStatusBar
      overlay={
        <IzSheet open={!!sheet} onClose={() => setSheetSide(null)}>
          {sheet && (
            <>
              <div className="iz-cardttl">{sheet.title}</div>
              <p className="iz-tiny iz-muted mb-3.5">
                Permissions differ per sub-role ? pick how you sign in.
              </p>
              {sheet.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="iz-card iz-between mb-2.5 w-full cursor-pointer text-left"
                  onClick={() => enter(item.role, item.path, item.prSubRole)}
                >
                  <div>
                    <div className="font-sora text-[15px] font-bold text-[var(--iz-txt)]">{item.label}</div>
                    <p className="iz-tiny iz-muted mt-0.5">{item.desc}</p>
                  </div>
                  <span className="iz-iconbox">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </>
          )}
        </IzSheet>
      }
    >
      <div className="iz-welcome">
        <div className="iz-between mt-1.5">
          <div className="iz-wordmark">
            Innocen<span className="iz-wordmark-z">Z</span>
          </div>
          <button type="button" className="iz-chip" onClick={() => enter("host", "/host")}>
            Skip
          </button>
        </div>

        <div className="iz-logo-tile !mt-[26px]">
          <span>Z</span>
        </div>

        <div className="text-center">
          <div className="font-sora iz-tiny font-bold tracking-[0.3em] text-[var(--iz-gold)]">
            CONNECT ? ENGAGE ? ENTERTAIN
          </div>
          <h1 className="font-sora mt-3 text-[27px] font-extrabold text-[var(--iz-txt)]">
            Welcome to Innocen<span className="iz-wordmark-z">Z</span>
          </h1>
          <p className="iz-sm iz-muted mx-auto mt-1.5 max-w-[290px]">
            One platform for the entertainment hospitality workforce. Choose your role ? each unlocks only its
            permitted tools.
          </p>
        </div>

        <div className="iz-role-grid">
          {ROLES.map((r) => (
            <RoleCard key={r.side} role={r} onPick={() => setSheetSide(r.side)} />
          ))}
        </div>

        <div className="mt-3.5 text-center">
          <Link to="/signin" className="iz-chip inline-flex">
            <Shield className="h-3 w-3" /> Forgot password / OTP recovery
          </Link>
        </div>

        <p className="iz-tiny iz-muted2 mt-3 text-center">
          <Shield className="mr-1 inline h-3 w-3" />
          Your data is secure with us ? RBAC + PDPA enforced
        </p>
      </div>
    </PhoneFrame>
  );
}

function RoleCard({
  role,
  onPick,
}: {
  role: (typeof ROLES)[number];
  onPick: () => void;
}) {
  return (
    <button type="button" onClick={onPick} className="iz-role-card w-full text-left">
      <div className="iz-role-icon">
        <role.icon className="h-[21px] w-[21px]" strokeWidth={1.8} />
      </div>
      <span className="iz-role-arrow">
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
      <h4>{role.title}</h4>
      <p>{role.desc}</p>
    </button>
  );
}
