import { Building2 } from "lucide-react";
import { FREELANCER_PAYROLL_GUIDANCE, FREELANCER_PAYROLL_STEPS } from "@/lib/pr-demo";
import { IzCard } from "@/components/iz/ui";

export function FreelancerPayrollNotice({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="iz-tiny iz-muted rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
        <Building2 className="mr-1 inline h-3 w-3 text-[var(--iz-blue)]" />
        {FREELANCER_PAYROLL_GUIDANCE}
      </p>
    );
  }

  return (
    <IzCard
      flat
      className="border-[rgba(111,176,255,.35)] bg-[linear-gradient(180deg,rgba(111,176,255,.1),transparent)]"
    >
      <p className="iz-sm font-bold text-[var(--iz-blue)]">
        <Building2 className="mr-1 inline h-3.5 w-3.5" />
        Freelancer payroll
      </p>
      <p className="iz-tiny iz-muted mt-1.5">{FREELANCER_PAYROLL_GUIDANCE}</p>
      <ol className="iz-tiny iz-muted2 mt-2.5 list-decimal space-y-1.5 pl-4">
        {FREELANCER_PAYROLL_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </IzCard>
  );
}
