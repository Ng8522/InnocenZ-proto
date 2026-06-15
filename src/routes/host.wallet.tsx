import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — redirects to PaymentVoucher. */
export const Route = createFileRoute("/host/wallet")({
  validateSearch: (search: Record<string, unknown>): { pvId?: string } => ({
    pvId: typeof search.pvId === "string" ? search.pvId : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/host/PaymentVoucher",
      search: search.pvId ? { pvId: search.pvId } : {},
    });
  },
});
