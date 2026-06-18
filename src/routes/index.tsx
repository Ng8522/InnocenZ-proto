import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Users, Star, Shield, ArrowRight, RotateCcw } from "lucide-react";
import { useStore, type Role } from "@/lib/store";
import { getAgencyDefaultRoute, type AgencySubRole } from "@/lib/agency-rbac";
import { getOutletDefaultRoute, type OutletSubRole } from "@/lib/outlet-rbac";
import type { PrSubRole } from "@/lib/pr-demo";
import { PhoneFrame } from "@/components/Brand";
import { IzSheet } from "@/components/iz/Sheet";

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

type Side = "outlet" | "agency" | "pr";
type SheetSide = "outlet" | "agency";

const ROLES: { side: Side; role: Role; icon: typeof Building2; title: string }[] = [
  { side: "outlet", role: "vendor", icon: Building2, title: "Outlet" },
  { side: "agency", role: "agency", icon: Users, title: "PR Agency" },
  { side: "pr", role: "host", icon: Star, title: "PR" },
];

const SUB_ROLES: Record<
  SheetSide,
  {
    title: string;
    items: {
      label: string;
      role: Role;
      path: string;
      prSubRole?: PrSubRole;
      outletSubRole?: OutletSubRole;
      agencySubRole?: AgencySubRole;
    }[];
  }
> = {
  outlet: {
    title: "Outlet sub-role",
    items: [
      {
        label: "Owner",
        role: "vendor",
        path: "/outlet",
        outletSubRole: "outlet_owner",
      },
      {
        label: "Finance",
        role: "vendor",
        path: "/outlet",
        outletSubRole: "outlet_finance",
      },
      {
        label: "Operations Head",
        role: "vendor",
        path: "/outlet",
        outletSubRole: "outlet_ops",
      },
    ],
  },
  agency: {
    title: "Agency sub-role",
    items: [
      {
        label: "Owner",
        role: "agency",
        path: "/agency",
        agencySubRole: "agency_owner",
      },
      {
        label: "Finance",
        role: "agency",
        path: "/agency",
        agencySubRole: "agency_finance",
      },
    ],
  },
};

function Welcome() {
  const setRole = useStore((s) => s.setRole);
  const setPrSubRole = useStore((s) => s.setPrSubRole);
  const setOutletSubRole = useStore((s) => s.setOutletSubRole);
  const setAgencySubRole = useStore((s) => s.setAgencySubRole);
  const resetPrShift = useStore((s) => s.resetPrShift);
  const resetDemo = useStore((s) => s.resetDemo);
  const toast = useStore((s) => s.toast);
  const [sheetSide, setSheetSide] = useState<SheetSide | null>(null);

  const handleResetDemo = () => {
    resetDemo();
    setSheetSide(null);
    toast("All demo data reset — Outlet, Agency & PR", "success");
  };

  const sheet = sheetSide ? SUB_ROLES[sheetSide] : null;

  return (
    <PhoneFrame
      showStatusBar
      overlay={
        <IzSheet open={!!sheet} onClose={() => setSheetSide(null)}>
          {sheet && (
            <>
              <button
                type="button"
                className="iz-chip mb-3 w-fit"
                onClick={() => setSheetSide(null)}
              >
                ← Back
              </button>
              <div className="iz-cardttl">{sheet.title}</div>
              {sheet.items.map((item) => {
                const to =
                  item.role === "vendor" && item.outletSubRole
                    ? getOutletDefaultRoute(item.outletSubRole)
                    : item.role === "agency" && item.agencySubRole
                      ? getAgencyDefaultRoute(item.agencySubRole)
                      : item.path;
                return (
                  <Link
                    key={item.label}
                    to={to}
                    className="iz-card iz-between mb-2.5 block w-full cursor-pointer text-left no-underline"
                    onClick={() => {
                      setRole(item.role);
                      setPrSubRole(item.prSubRole ?? null);
                      setOutletSubRole(item.outletSubRole ?? null);
                      setAgencySubRole(item.agencySubRole ?? null);
                      setSheetSide(null);
                    }}
                  >
                    <div>
                      <div className="font-sora text-[15px] font-bold text-[var(--iz-txt)]">
                        {item.label}
                      </div>
                    </div>
                    <span className="iz-iconbox">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </IzSheet>
      }
    >
      <div className="iz-welcome">
        <div className="iz-wordmark mt-1.5">
          Innocen<span className="iz-wordmark-z">Z</span>
        </div>

        <div className="iz-logo-tile !mt-[26px]">
          <span>Z</span>
        </div>

        <div className="text-center">
          <h1 className="font-sora mt-3 text-[27px] font-extrabold text-[var(--iz-txt)]">
            Welcome to Innocen<span className="iz-wordmark-z">Z</span>
          </h1>
        </div>

        <div className="iz-role-grid">
          {ROLES.map((r) => (
            <RoleCard
              key={r.side}
              role={r}
              to={r.side === "pr" ? "/host" : undefined}
              onPick={() => {
                if (r.side === "pr") {
                  setRole("host");
                  setPrSubRole("pr_tied");
                  setOutletSubRole(null);
                  setAgencySubRole(null);
                  resetPrShift();
                  setSheetSide(null);
                  return;
                }
                setSheetSide(r.side);
              }}
            />
          ))}
        </div>

        <div className="mt-3.5 flex flex-col items-center gap-2">
          <Link to="/signin" className="iz-chip inline-flex">
            <Shield className="h-3 w-3" /> Forgot password / OTP recovery
          </Link>
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

function RoleCard({
  role,
  onPick,
  to,
}: {
  role: (typeof ROLES)[number];
  onPick: () => void;
  to?: "/host";
}) {
  const body = (
    <>
      <div className="iz-role-icon">
        <role.icon className="h-[21px] w-[21px]" strokeWidth={1.8} />
      </div>
      <span className="iz-role-arrow">
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
      <h4>{role.title}</h4>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="iz-role-card block w-full text-left no-underline" onClick={onPick}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onPick} className="iz-role-card w-full text-left">
      {body}
    </button>
  );
}
