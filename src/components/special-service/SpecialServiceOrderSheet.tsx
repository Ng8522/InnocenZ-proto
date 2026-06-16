import { IzSelect, IzTimeInput, formatRM } from "@/components/iz/ui";
import {
  AGENCY_SPECIAL_SERVICE_OFFERS,
  specialServiceOffer,
} from "@/lib/special-service-demo";
import type { SpecialServiceInitiator } from "@/lib/special-service-demo";

export type SpecialServiceOrderDraft = {
  prId: string;
  outlet: string;
  serviceType: string;
  amountOut: string;
  amountIn: string;
  time: string;
  note: string;
};

export function SpecialServiceOrderSheet({
  role,
  draft,
  onChange,
  prOptions,
  outletOptions,
  showOutletPicker,
  showPrPicker,
  showAmountIn,
  onSubmit,
  submitLabel,
}: {
  role: SpecialServiceInitiator;
  draft: SpecialServiceOrderDraft;
  onChange: (patch: Partial<SpecialServiceOrderDraft>) => void;
  prOptions: { id: string; name: string }[];
  outletOptions?: string[];
  showOutletPicker?: boolean;
  showPrPicker?: boolean;
  showAmountIn?: boolean;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const offer = specialServiceOffer(draft.serviceType);

  const onServiceTypeChange = (serviceId: string) => {
    const next = specialServiceOffer(serviceId);
    onChange({
      serviceType: serviceId,
      amountOut: next ? String(next.defaultRate) : draft.amountOut,
    });
  };

  return (
    <>
      <div className="iz-cardttl">
        {role === "agency" ? "Book agency service" : "Order agency service"}
      </div>
      <p className="iz-tiny iz-muted mb-3">
        {role === "agency"
          ? "Book on behalf of a PR or outlet — they will be notified to accept or decline."
          : role === "outlet"
            ? "Request an add-on from your agency — transportation, delivery, wardrobe, and more."
            : "Request an agency add-on service — your agency will review and confirm."}
      </p>

      {showPrPicker !== false && (
        <>
          <label className="iz-tiny iz-muted mb-1 block">PR</label>
          <IzSelect
            block
            className="mb-3 !text-sm"
            value={draft.prId}
            onChange={(e) => onChange({ prId: e.target.value })}
          >
            {prOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </IzSelect>
        </>
      )}

      {showOutletPicker && outletOptions && (
        <>
          <label className="iz-tiny iz-muted mb-1 block">Outlet</label>
          <IzSelect
            block
            className="mb-3 !text-sm"
            value={draft.outlet}
            onChange={(e) => onChange({ outlet: e.target.value })}
          >
            {outletOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </IzSelect>
        </>
      )}

      <label className="iz-tiny iz-muted mb-1 block">Service</label>
      <IzSelect
        block
        className="mb-1 !text-sm"
        value={draft.serviceType}
        onChange={(e) => onServiceTypeChange(e.target.value)}
      >
        {AGENCY_SPECIAL_SERVICE_OFFERS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </IzSelect>
      {offer && <p className="iz-tiny iz-muted2 mb-3">{offer.summary}</p>}

      {role === "agency" && (
        <>
          <label className="iz-tiny iz-muted mb-1 block">
            Amount out (RM)
            {offer && <span className="iz-muted2"> · default {formatRM(offer.defaultRate)}</span>}
          </label>
          <input
            type="number"
            min={0}
            step={5}
            className="iz-field-input mb-3 !text-sm"
            value={draft.amountOut}
            onChange={(e) => onChange({ amountOut: e.target.value })}
          />
        </>
      )}

      {(showAmountIn || role === "agency") && (
        <>
          <label className="iz-tiny iz-muted mb-1 block">Amount in (RM) · outlet recovery</label>
          <input
            type="number"
            min={0}
            step={5}
            className="iz-field-input mb-3 !text-sm"
            placeholder="0 if agency absorbs"
            value={draft.amountIn}
            onChange={(e) => onChange({ amountIn: e.target.value })}
          />
        </>
      )}

      <label className="iz-tiny iz-muted mb-1 block">Service time</label>
      <IzTimeInput
        value={draft.time}
        onChange={(time) => onChange({ time })}
        className="mb-3 !text-sm"
        aria-label="Service time"
      />

      <label className="iz-tiny iz-muted mb-1 block">Notes</label>
      <textarea
        className="iz-field-input mb-4 min-h-[72px] !text-sm"
        placeholder="Pickup address, delivery items, outlet contact…"
        value={draft.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />

      <button type="button" className="iz-btn iz-btn-primary w-full" onClick={onSubmit}>
        {submitLabel}
      </button>
    </>
  );
}
