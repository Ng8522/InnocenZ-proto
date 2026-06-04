import { Building2 } from "lucide-react";
import { FREELANCER_PAYROLL_GUIDANCE, FREELANCER_PAYROLL_STEPS } from "@/lib/pr-demo";
import { IzCard } from "@/components/iz/ui";

export function FreelancerPayrollNotice({ compact }: { compact?: boolean }) {
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
      {!compact && (
        <ol className="iz-tiny iz-muted2 mt-2.5 list-decimal space-y-1.5 pl-4">
          {FREELANCER_PAYROLL_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </IzCard>
  );
}
