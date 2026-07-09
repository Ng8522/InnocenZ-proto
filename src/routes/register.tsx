import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhoneFrame } from "@/components/Brand";
import { IzSheet } from "@/components/iz/Sheet";
import { Toasts } from "@/components/Toasts";
import { isValidDemoOtp } from "@/components/auth/OtpVerifySheet";
import { useStore } from "@/lib/store";
import { getPrAgencyById, PR_AGENCIES, DEFAULT_TIED_AGENCY_ID, PORTFOLIO_SLOT_COUNT } from "@/lib/pr-demo";
import { PortfolioGalleryPicker, portfolioFilledCount } from "@/components/pr/PortfolioGalleryPicker";
import { publicAssetPath } from "@/lib/public-asset";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  IdCard,
  MapPin,
  RotateCcw,
  Search,
  Star,
  User,
  X,
  Clock,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { TitleWithIcon } from "@/components/iz/TitleWithIcon";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const STEPS: { id: number; title: string; subtitle: string; icon: LucideIcon }[] = [
  { id: 1, title: "Persona", subtitle: "Your details", icon: User },
  { id: 2, title: "Address", subtitle: "Where you live", icon: MapPin },
  { id: 3, title: "Agency", subtitle: "Optional tie", icon: Building2 },
  { id: 4, title: "Verify", subtitle: "ID & gallery photos", icon: IdCard },
  { id: 5, title: "Summary", subtitle: "Review & submit", icon: ClipboardList },
  { id: 6, title: "OTP", subtitle: "Verify your mobile", icon: Smartphone },
];

const ID_TYPES = ["NRIC", "Passport", "Work permit"] as const;
type IdType = (typeof ID_TYPES)[number];
const NRIC_LENGTH = 12;

const PHONE_DIAL_CODES = [
  { code: "+60", label: "+60" },
  { code: "+65", label: "+65" },
  { code: "+62", label: "+62" },
  { code: "+66", label: "+66" },
  { code: "+63", label: "+63" },
  { code: "+86", label: "+86" },
  { code: "+91", label: "+91" },
  { code: "+1", label: "+1" },
  { code: "+44", label: "+44" },
  { code: "+61", label: "+61" },
] as const;

/** Country list for nationality combobox — field label stays "Nationality" */
const NATIONALITY_COUNTRIES = [
  "Malaysia",
  "Singapore",
  "Indonesia",
  "Thailand",
  "Philippines",
  "China",
  "India",
  "Brunei",
  "Vietnam",
  "Myanmar",
  "Cambodia",
  "Laos",
  "Japan",
  "South Korea",
  "Taiwan",
  "Hong Kong",
  "Australia",
  "New Zealand",
  "United Kingdom",
  "United States",
  "Canada",
  "France",
  "Germany",
  "Netherlands",
  "Russia",
  "Bangladesh",
  "Pakistan",
  "Nepal",
  "Sri Lanka",
] as const;

const MY_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Malacca",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
] as const;

type RegisterDraft = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneDialCode: string;
  phoneNumber: string;
  nationality: string;
  idType: IdType;
  idNo: string;
  dob: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  state: string;
  country: string;
  underAgency: boolean | null;
  agencyId: string;
  idPhotoFront: string | null;
  idPhotoBack: string | null;
  profilePhoto: string | null;
  portfolio: (string | null)[];
  acceptPrivacy: boolean;
  acceptTruth: boolean;
  acceptAgencyShare: boolean;
  acceptTerms: boolean;
};

function dobToNricPrefix(dob: string): string {
  if (!dob) return "";
  const [year, month, day] = dob.split("-");
  if (!year || !month || !day) return "";
  return `${year.slice(-2)}${month}${day}`;
}

function digitsOnlyNric(value: string): string {
  return value.replace(/\D/g, "").slice(0, NRIC_LENGTH);
}

/** Keep NRIC suffix (digits 7–12) when DOB changes; refresh YYMMDD prefix. */
function mergeNricWithDob(dob: string, idNo: string): string {
  const prefix = dobToNricPrefix(dob);
  const digits = digitsOnlyNric(idNo);
  if (!prefix) return digits;
  const suffix = digits.length > 6 ? digits.slice(6) : "";
  return prefix + suffix;
}

function nricMatchesDob(dob: string, idNo: string): boolean {
  const prefix = dobToNricPrefix(dob);
  const digits = digitsOnlyNric(idNo);
  return Boolean(prefix) && digits.length === NRIC_LENGTH && digits.startsWith(prefix);
}

function sanitizeIdNo(idType: IdType, raw: string): string {
  if (idType === "NRIC") return digitsOnlyNric(raw);
  return raw.replace(/[^\dA-Za-z]/g, "").slice(0, 20);
}

function formatFullPhone(dialCode: string, local: string): string {
  const digits = local.replace(/\D/g, "");
  return digits ? `${dialCode}${digits}` : "";
}

function randomDemoPhoneNumber(): string {
  const prefixes = ["12", "13", "14", "16", "17", "18", "19"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]!;
  let suffix = "";
  for (let i = 0; i < 7; i += 1) suffix += Math.floor(Math.random() * 10);
  return prefix + suffix;
}

function buildEmptyPortfolio(): (string | null)[] {
  return Array.from({ length: PORTFOLIO_SLOT_COUNT }, () => null);
}

function buildEmptyRegisterDraft(): RegisterDraft {
  return {
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneDialCode: "+60",
    phoneNumber: "",
    nationality: "Malaysia",
    idType: "NRIC",
    idNo: "",
    dob: "",
    addressLine1: "",
    addressLine2: "",
    postcode: "",
    state: "Selangor",
    country: "Malaysia",
    underAgency: null,
    agencyId: "",
    idPhotoFront: null,
    idPhotoBack: null,
    profilePhoto: null,
    portfolio: buildEmptyPortfolio(),
    acceptPrivacy: false,
    acceptTruth: false,
    acceptAgencyShare: false,
    acceptTerms: false,
  };
}

function buildDemoRegisterDraft(): RegisterDraft {
  const dob = "1995-03-12";
  return {
    username: "CF Tan",
    firstName: "Chee Fung",
    lastName: "Tan",
    email: "cheefung.tan@gmail.com",
    phoneDialCode: "+60",
    phoneNumber: randomDemoPhoneNumber(),
    nationality: "Malaysia",
    idType: "NRIC",
    idNo: mergeNricWithDob(dob, "950312148821"),
    dob,
    addressLine1: "12 Jalan SS2/24",
    addressLine2: "Petaling Jaya",
    postcode: "47300",
    state: "Selangor",
    country: "Malaysia",
    underAgency: true,
    agencyId: DEFAULT_TIED_AGENCY_ID,
    idPhotoFront: null,
    idPhotoBack: null,
    profilePhoto: null,
    portfolio: buildEmptyPortfolio(),
    acceptPrivacy: true,
    acceptTruth: true,
    acceptAgencyShare: true,
    acceptTerms: true,
  };
}

function readImageFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onLoad(reader.result);
  };
  reader.readAsDataURL(file);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="iz-field block">
      <span className="iz-field-label">{label}</span>
      {children}
    </label>
  );
}

function NationalityCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((country) => country.toLowerCase().includes(q));
  }, [search, options]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  const select = (country: string) => {
    onChange(country);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`iz-combobox-trigger${value ? " iz-combobox-trigger--filled" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="iz-combobox-trigger__label">{value || "Select country"}</span>
        <ChevronDown className={`iz-combobox-trigger__icon${open ? " is-open" : ""}`} aria-hidden />
      </button>

      <IzSheet open={open} onClose={() => setOpen(false)}>
        <div className="iz-sheet-head">
          <h3>Nationality</h3>
          <button
            type="button"
            className="iz-sheet-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="iz-combobox-search">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country"
            aria-label="Search country"
          />
        </label>

        <div className="iz-combobox-list" role="listbox">
          {filtered.length === 0 ? (
            <p className="iz-combobox-empty">No countries found</p>
          ) : (
            filtered.map((country) => (
              <button
                key={country}
                type="button"
                role="option"
                aria-selected={country === value}
                className={`iz-combobox-option${country === value ? " iz-combobox-option--selected" : ""}`}
                onClick={() => select(country)}
              >
                <span>{country}</span>
                {country === value && (
                  <Check className="h-4 w-4 shrink-0 text-[var(--iz-gold-l)]" strokeWidth={2.5} />
                )}
              </button>
            ))
          )}
        </div>
      </IzSheet>
    </>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="iz-reg-steps" aria-label={`Step ${step} of ${STEPS.length}`}>
      {STEPS.map((s) => (
        <div
          key={s.id}
          className={`iz-reg-step ${s.id === step ? "iz-reg-step--active" : ""} ${s.id < step ? "iz-reg-step--done" : ""}`}
        >
          <span className="iz-reg-step__dot">{s.id < step ? <Check className="h-3 w-3" /> : s.id}</span>
          <span className="iz-reg-step__lbl">
            <s.icon className="iz-reg-step__icon" aria-hidden />
            {s.title}
          </span>
        </div>
      ))}
    </div>
  );
}

function IdPhotoSlot({
  label,
  hint,
  value,
  onPick,
}: {
  label: string;
  hint: string;
  value: string | null;
  onPick: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="iz-reg-id-slot">
      <button
        type="button"
        className="iz-reg-id-slot__btn"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt={label} className="iz-reg-id-slot__img" />
        ) : (
          <span className="iz-reg-id-slot__empty">
            <Camera className="h-7 w-7 text-[var(--iz-muted)]" />
            <span className="iz-tiny iz-muted mt-2">{hint}</span>
          </span>
        )}
      </button>
      <div className="iz-tiny iz-muted mt-1.5 text-center">{label}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readImageFile(file, onPick);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function AgencySummary({ agencyId }: { agencyId: string }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const agency = getPrAgencyById(agencyId);
  if (!agency) return null;

  return (
    <>
      <div className="iz-reg-agency-card">
        <div className="iz-reg-agency-card__av" style={{ background: agency.gradient }}>
          {agency.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-sora text-[14px] font-bold text-[var(--iz-txt)]">{agency.name}</div>
          <div className="iz-tiny iz-muted mt-0.5">
            {agency.city} · {agency.tagline}
          </div>
          <div className="iz-tiny iz-muted2 mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-[var(--iz-gold-l)] text-[var(--iz-gold-l)]" />
              {agency.rating.toFixed(1)}
            </span>
          </div>
          <p className="iz-tiny iz-muted mt-1.5 line-clamp-2">{agency.address}</p>
        </div>
      </div>
      <button
        type="button"
        className="iz-btn iz-btn-soft mt-2.5 w-full !min-h-[42px] !text-sm"
        onClick={() => setDetailsOpen(true)}
      >
        View details
      </button>

      <IzSheet open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="iz-sheet-head">
          <h3>Agency details</h3>
          <button
            type="button"
            className="iz-sheet-close"
            onClick={() => setDetailsOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="iz-reg-agency-detail">
          <div className="iz-reg-agency-detail__hero">
            <div className="iz-reg-agency-detail__av" style={{ background: agency.gradient }}>
              {agency.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">{agency.name}</div>
              <div className="iz-sm iz-muted mt-0.5">{agency.city}</div>
              <div className="iz-tiny iz-muted mt-1">{agency.tagline}</div>
            </div>
          </div>

          <dl className="iz-reg-agency-detail__grid">
            <div>
              <dt className="iz-tiny iz-muted">Rating</dt>
              <dd className="iz-sm mt-0.5 inline-flex items-center gap-1 text-[var(--iz-txt)]">
                <Star className="h-3.5 w-3.5 fill-[var(--iz-gold-l)] text-[var(--iz-gold-l)]" />
                {agency.rating.toFixed(1)} / 5
              </dd>
            </div>
            <div>
              <dt className="iz-tiny iz-muted">Finance head</dt>
              <dd className="iz-sm mt-0.5 text-[var(--iz-txt)]">{agency.financeHead}</dd>
            </div>
            <div className="iz-reg-agency-detail__full">
              <dt className="iz-tiny iz-muted">Address</dt>
              <dd className="iz-sm mt-0.5 text-[var(--iz-txt)]">{agency.address}</dd>
            </div>
          </dl>

          <p className="iz-sm iz-muted leading-relaxed">
            Payroll, Payment Voucher approval, and roster support are handled through{" "}
            <span className="text-[var(--iz-txt)]">{agency.name}</span> once they accept your
            registration tie. Your agency can view payroll-related records needed to process your
            shifts and commissions.
          </p>
        </div>

        <button
          type="button"
          className="iz-btn iz-btn-primary mt-4 w-full"
          onClick={() => setDetailsOpen(false)}
        >
          Done
        </button>
      </IzSheet>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="iz-reg-summary-row">
      <dt className="iz-tiny iz-muted">{label}</dt>
      <dd className="iz-sm text-[var(--iz-txt)]">{value}</dd>
    </div>
  );
}

type DisclaimerKey = "privacy" | "truth" | "agency" | "terms";

function DisclaimerSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <IzSheet open={open} onClose={onClose}>
      <div className="iz-sheet-head">
        <h3>{title}</h3>
        <button type="button" className="iz-sheet-close" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="iz-sm iz-muted leading-relaxed">{children}</div>
      <button type="button" className="iz-btn iz-btn-primary mt-4 w-full" onClick={onClose}>
        Done
      </button>
    </IzSheet>
  );
}

function AcknowledgementRow({
  checked,
  onCheckedChange,
  title,
  onTitleClick,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  onTitleClick: () => void;
}) {
  return (
    <div className="iz-reg-ack-row">
      <input
        type="checkbox"
        className="iz-reg-ack-row__check"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-label={title}
      />
      <button type="button" className="iz-reg-ack-link" onClick={onTitleClick}>
        {title}
      </button>
    </div>
  );
}

function RegistrationAcknowledgements({
  draft,
  patch,
}: {
  draft: RegisterDraft;
  patch: (partial: Partial<RegisterDraft>) => void;
}) {
  const [openDisclaimer, setOpenDisclaimer] = useState<DisclaimerKey | null>(null);

  return (
    <>
      <section className="iz-reg-ack-card">
        <h4 className="iz-reg-ack-card__title">Acknowledgements</h4>
        <AcknowledgementRow
          checked={draft.acceptPrivacy}
          onCheckedChange={(acceptPrivacy) => patch({ acceptPrivacy })}
          title="Personal Information Disclaimer"
          onTitleClick={() => setOpenDisclaimer("privacy")}
        />
        <AcknowledgementRow
          checked={draft.acceptTruth}
          onCheckedChange={(acceptTruth) => patch({ acceptTruth })}
          title="Declaration of Truth"
          onTitleClick={() => setOpenDisclaimer("truth")}
        />
        <AcknowledgementRow
          checked={draft.acceptAgencyShare}
          onCheckedChange={(acceptAgencyShare) => patch({ acceptAgencyShare })}
          title="Agency Information Sharing"
          onTitleClick={() => setOpenDisclaimer("agency")}
        />
      </section>

      <section className="iz-reg-terms-block">
        <h4 className="iz-reg-terms-block__title">Terms and Conditions</h4>
        <label className="iz-reg-terms-row">
          <input
            type="checkbox"
            className="iz-reg-ack-row__check"
            checked={draft.acceptTerms}
            onChange={(e) => patch({ acceptTerms: e.target.checked })}
          />
          <span className="iz-sm text-[var(--iz-txt)]">
            I have read and agree to the{" "}
            <button
              type="button"
              className="iz-reg-terms-link"
              onClick={() => setOpenDisclaimer("terms")}
            >
              Terms &amp; Conditions
            </button>
          </span>
        </label>
      </section>

      <DisclaimerSheet
        open={openDisclaimer === "privacy"}
        title="Personal Information Disclaimer"
        onClose={() => setOpenDisclaimer(null)}
      >
        <p>
          Your identity documents, contact details, and address are stored securely on InnocenZ.
          Only your linked PR agency (if any) and InnocenZ compliance staff can access this
          data — outlets and other PRs cannot view your private records.
        </p>
      </DisclaimerSheet>

      <DisclaimerSheet
        open={openDisclaimer === "truth"}
        title="Declaration of Truth"
        onClose={() => setOpenDisclaimer(null)}
      >
        <p>
          I declare that all information and documents submitted are true, current, and belong to
          me. I understand that false or misleading statements may result in account suspension or
          removal from the platform.
        </p>
      </DisclaimerSheet>

      <DisclaimerSheet
        open={openDisclaimer === "agency"}
        title="Agency Information Sharing"
        onClose={() => setOpenDisclaimer(null)}
      >
        <p>
          Your profile may be shared with registered InnocenZ agencies for payroll, roster, and
          compliance purposes. If you register as a Freelancer, an agency will be auto-assigned to
          support your shifts and Payment Vouchers.
        </p>
      </DisclaimerSheet>

      <DisclaimerSheet
        open={openDisclaimer === "terms"}
        title="Terms & Conditions"
        onClose={() => setOpenDisclaimer(null)}
      >
        <p>
          I agree to InnocenZ platform rules, shift sealing, commission transparency, and dispute
          processes as described in the InnocenZ PR terms. Continued use of the platform constitutes
          acceptance of updates to these terms.
        </p>
      </DisclaimerSheet>
    </>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const submitPrRegistration = useStore((s) => s.submitPrRegistration);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [otp, setOtp] = useState("");
  const [draft, setDraft] = useState<RegisterDraft>(() => buildEmptyRegisterDraft());
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<RegisterDraft>) => setDraft((d) => ({ ...d, ...partial }));

  const fillDemo = () => {
    setDraft(buildDemoRegisterDraft());
    toast("Demo data filled — tap Continue through each step", "info");
  };

  const onDobChange = (dob: string) => {
    patch({
      dob,
      idNo: draft.idType === "NRIC" ? mergeNricWithDob(dob, draft.idNo) : draft.idNo,
    });
  };

  const onIdTypeChange = (idType: IdType) => {
    patch({
      idType,
      idNo:
        idType === "NRIC"
          ? mergeNricWithDob(draft.dob, draft.idNo)
          : sanitizeIdNo(idType, draft.idNo),
    });
  };

  const onIdNoChange = (raw: string) => {
    patch({ idNo: sanitizeIdNo(draft.idType, raw) });
  };

  const onPhoneNumberChange = (raw: string) => {
    patch({ phoneNumber: raw.replace(/\D/g, "").slice(0, 15) });
  };

  const fullPhone = formatFullPhone(draft.phoneDialCode, draft.phoneNumber);
  const isNric = draft.idType === "NRIC";
  const nricPrefix = dobToNricPrefix(draft.dob);
  const idNoInvalid =
    isNric &&
    draft.dob &&
    draft.idNo &&
    (digitsOnlyNric(draft.idNo).length > 0 && !digitsOnlyNric(draft.idNo).startsWith(nricPrefix));

  const displayName =
    [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim() || draft.username;

  const validateStep = (n: number): boolean => {
    if (n === 1) {
      if (!draft.username.trim()) {
        toast("Enter a username", "warn");
        return false;
      }
      if (!draft.firstName.trim() || !draft.lastName.trim()) {
        toast("Enter your first and last name", "warn");
        return false;
      }
      if (!fullPhone) {
        toast("Enter your phone number", "warn");
        return false;
      }
      if (!draft.dob) {
        toast("Select your date of birth", "warn");
        return false;
      }
      if (!draft.idNo.trim()) {
        toast("Enter your ID number", "warn");
        return false;
      }
      if (draft.idType === "NRIC") {
        const digits = digitsOnlyNric(draft.idNo);
        if (digits.length !== NRIC_LENGTH) {
          toast(`NRIC must be ${NRIC_LENGTH} digits (no dashes)`, "warn");
          return false;
        }
        if (!nricMatchesDob(draft.dob, draft.idNo)) {
          toast("First 6 NRIC digits must match DOB (YYMMDD)", "warn");
          return false;
        }
      }
      return true;
    }
    if (n === 2) {
      if (!draft.addressLine1.trim()) {
        toast("Enter address line 1", "warn");
        return false;
      }
      if (!draft.postcode.trim()) {
        toast("Enter postcode", "warn");
        return false;
      }
      return true;
    }
    if (n === 3) {
      if (draft.underAgency === null) {
        toast("Please answer whether you are under an agency", "warn");
        return false;
      }
      if (draft.underAgency && !draft.agencyId) {
        toast("Select an agency", "warn");
        return false;
      }
      return true;
    }
    if (n === 4) {
      if (!draft.idPhotoFront || !draft.idPhotoBack) {
        toast("Upload front and back ID photos", "warn");
        return false;
      }
      if (portfolioFilledCount(draft.portfolio) < 1) {
        toast("Add at least one gallery photo", "warn");
        return false;
      }
      return true;
    }
    if (n === 5) {
      if (!draft.profilePhoto) {
        toast("Upload a profile photo", "warn");
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  useEffect(() => {
    if (step === 6 && fullPhone) {
      toast("OTP sent to your mobile", "info");
    }
  }, [step, fullPhone, toast]);

  const proceedToVerification = () => {
    if (!validateStep(5)) return;
    if (!draft.acceptPrivacy || !draft.acceptTruth || !draft.acceptAgencyShare || !draft.acceptTerms) {
      toast("Accept all acknowledgements and terms to continue", "warn");
      return;
    }
    setOtp("");
    setStep(6);
  };

  const verifyRegistrationOtp = () => {
    if (!isValidDemoOtp(otp)) {
      toast("Invalid OTP — try 123456 for demo", "warn");
      return;
    }
    submit();
  };

  const goBack = () => {
    if (step === 1) {
      navigate({ to: "/signin" });
      return;
    }
    setStep((s) => s - 1);
  };

  const submit = () => {
    if (!draft.acceptPrivacy || !draft.acceptTruth || !draft.acceptAgencyShare || !draft.acceptTerms) {
      toast("Accept all acknowledgements and terms to continue", "warn");
      return;
    }
    submitPrRegistration({
      displayName,
      email: draft.email,
      mobile: fullPhone,
      ic: draft.idNo,
      nationality: draft.nationality,
      idPhotoFront: draft.idPhotoFront,
      idPhotoBack: draft.idPhotoBack,
      profilePhoto: draft.profilePhoto,
      portfolio: draft.portfolio,
      underAgency: draft.underAgency === true,
      agencyId: draft.agencyId,
    });
    toast("Registration submitted — awaiting agency verification", "success");
    setSubmitted(true);
  };

  const agencyName =
    draft.underAgency === false
      ? "your assigned agency"
      : draft.agencyId
        ? (getPrAgencyById(draft.agencyId)?.name ?? "your agency")
        : "your agency";

  if (submitted) {
    return (
      <PhoneFrame overlay={<Toasts />}>
        <div className="iz-welcome iz-reg-pending flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <div className="iz-reg-pending-card">
              <span className="iz-reg-pending-badge">Pending verification</span>
              <div className="iz-reg-pending__icon" aria-hidden>
                <Clock className="h-8 w-8 text-[var(--iz-amber)]" strokeWidth={2} />
              </div>
              <h1 className="font-sora mt-5 text-[22px] font-extrabold leading-tight text-[var(--iz-txt)]">
                Information updated
              </h1>
              <p className="iz-sm iz-muted mt-3 leading-relaxed">
                Your registration has been submitted. Please wait for{" "}
                <span className="font-semibold text-[var(--iz-txt)]">{agencyName}</span> to verify
                your account.
              </p>
              <p className="iz-reg-pending-note iz-tiny mt-4 leading-relaxed">
                Once verified, you will be notified by <b className="text-[var(--iz-txt)]">email</b>{" "}
                or <b className="text-[var(--iz-txt)]">WhatsApp</b>.
              </p>
              {portfolioFilledCount(draft.portfolio) > 0 && (
                <div className="mt-5 w-full border-t border-[var(--iz-line)] pt-4 text-left">
                  <p className="iz-tiny iz-muted mb-2">Your portfolio gallery</p>
                  <div className="grid grid-cols-4 gap-2">
                    {draft.portfolio.filter(Boolean).map((src, i) => (
                      <div key={i} className="aspect-square overflow-hidden rounded-lg border border-[var(--iz-line)]">
                        <img
                          src={publicAssetPath(src!)}
                          alt={`Gallery ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="iz-tiny iz-muted2 mt-2">
                    View and edit your gallery anytime in Profile after sign-in.
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/signin" })}
              className="iz-chip iz-reg-pending-back mt-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const current = STEPS[step - 1];

  return (
    <PhoneFrame overlay={<Toasts />}>
      <div className="iz-welcome iz-reg flex flex-1 flex-col">
        <div className="flex justify-end">
          {step < 6 && (
            <button type="button" onClick={fillDemo} className="iz-chip w-fit">
              <RotateCcw className="h-3.5 w-3.5" /> Demo fill
            </button>
          )}
        </div>

        <div className="mt-5">
          <p className="iz-tiny iz-muted uppercase tracking-wider">
            Step {step} of {STEPS.length}
          </p>
          <h1 className="font-sora mt-1 text-xl font-extrabold text-[var(--iz-txt)]">
            <TitleWithIcon icon={current.icon}>{current.title}</TitleWithIcon>
          </h1>
          <p className="iz-sm iz-muted">{current.subtitle}</p>
        </div>

        <StepDots step={step} />

        <div className="iz-reg-body mt-4 flex flex-1 flex-col gap-3">
          {step === 1 && (
            <>
              <Field label="Username">
                <input
                  className="iz-field-input w-full"
                  value={draft.username}
                  onChange={(e) => patch({ username: e.target.value })}
                  placeholder="e.g. alex.tan"
                  autoComplete="username"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    className="iz-field-input w-full"
                    value={draft.firstName}
                    onChange={(e) => patch({ firstName: e.target.value })}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    className="iz-field-input w-full"
                    value={draft.lastName}
                    onChange={(e) => patch({ lastName: e.target.value })}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </Field>
              </div>
              <Field label="Email (optional)">
                <input
                  className="iz-field-input w-full"
                  type="email"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="Optional"
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone">
                <div className="iz-phone-field">
                  <select
                    className="iz-select iz-phone-field__dial"
                    value={draft.phoneDialCode}
                    onChange={(e) => patch({ phoneDialCode: e.target.value })}
                    aria-label="Country code"
                  >
                    {PHONE_DIAL_CODES.map(({ code, label }) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="iz-phone-field__num"
                    type="tel"
                    value={draft.phoneNumber}
                    onChange={(e) => onPhoneNumberChange(e.target.value)}
                    placeholder="Mobile number"
                    inputMode="numeric"
                    autoComplete="tel-national"
                  />
                </div>
              </Field>
              <Field label="Nationality">
                <NationalityCombobox
                  value={draft.nationality}
                  onChange={(nationality) => patch({ nationality })}
                  options={NATIONALITY_COUNTRIES}
                />
              </Field>
              <Field label="Date of birth">
                <input
                  className="iz-field-input w-full"
                  type="date"
                  value={draft.dob}
                  onChange={(e) => onDobChange(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ID type">
                  <select
                    className="iz-select iz-select--field w-full"
                    value={draft.idType}
                    onChange={(e) => onIdTypeChange(e.target.value as IdType)}
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ID no.">
                  <input
                    className={`iz-field-input w-full ${idNoInvalid ? "!border-[var(--iz-red)]" : ""}`}
                    value={draft.idNo}
                    onChange={(e) => onIdNoChange(e.target.value)}
                    placeholder={isNric ? "12 digits" : "ID number"}
                    inputMode={isNric ? "numeric" : "text"}
                    pattern={isNric ? "[0-9]*" : undefined}
                    maxLength={isNric ? NRIC_LENGTH : 20}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="iz-reg-section-hd">
                <MapPin className="h-4 w-4 text-[var(--iz-gold-l)]" />
                <span>Current living place</span>
              </div>
              <Field label="Address line 1">
                <input
                  className="iz-field-input w-full"
                  value={draft.addressLine1}
                  onChange={(e) => patch({ addressLine1: e.target.value })}
                  placeholder="Street, unit, building"
                  autoComplete="address-line1"
                />
              </Field>
              <Field label="Address line 2">
                <input
                  className="iz-field-input w-full"
                  value={draft.addressLine2}
                  onChange={(e) => patch({ addressLine2: e.target.value })}
                  placeholder="Optional"
                  autoComplete="address-line2"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postcode">
                  <input
                    className="iz-field-input w-full"
                    value={draft.postcode}
                    onChange={(e) => patch({ postcode: e.target.value })}
                    placeholder="Postcode"
                    autoComplete="postal-code"
                  />
                </Field>
                <Field label="State">
                  <select
                    className="iz-select iz-select--field w-full"
                    value={draft.state}
                    onChange={(e) => patch({ state: e.target.value })}
                  >
                    {MY_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Country">
                <input
                  className="iz-field-input w-full"
                  value={draft.country}
                  onChange={(e) => patch({ country: e.target.value })}
                  autoComplete="country-name"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="iz-reg-section-hd">
                <Building2 className="h-4 w-4 text-[var(--iz-gold-l)]" />
                <span>Agency</span>
              </div>
              <p className="iz-sm iz-muted -mt-1">Are you currently under any PR agency?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`iz-chip w-full justify-center py-3 ${draft.underAgency === true ? "border-[var(--iz-gold)]" : ""}`}
                  onClick={() => patch({ underAgency: true })}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`iz-chip w-full justify-center py-3 ${draft.underAgency === false ? "border-[var(--iz-gold)]" : ""}`}
                  onClick={() => patch({ underAgency: false, agencyId: "" })}
                >
                  No — Freelancer
                </button>
              </div>
              {draft.underAgency === true && (
                <>
                  <Field label="Agency name">
                    <select
                      className="iz-select iz-select--field w-full"
                      value={draft.agencyId}
                      onChange={(e) => patch({ agencyId: e.target.value })}
                    >
                      <option value="">Select agency…</option>
                      {PR_AGENCIES.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {draft.agencyId && <AgencySummary agencyId={draft.agencyId} />}
                </>
              )}
              {draft.underAgency === false && (
                <p className="iz-tiny iz-muted rounded-[13px] border border-[var(--iz-line)] bg-white/[0.02] p-3">
                  You will register as a Freelancer. Your profile will be shared with registered
                  InnocenZ agencies — an agency will be auto-assigned to you for payroll and roster
                  support.
                </p>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="iz-reg-section-hd">
                <IdCard className="h-4 w-4 text-[var(--iz-gold-l)]" />
                <span>ID verification</span>
              </div>
              <p className="iz-sm iz-muted -mt-1">
                Take clear photos of your {draft.idType} — front and back.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <IdPhotoSlot
                  label="Front"
                  hint="Tap to capture front"
                  value={draft.idPhotoFront}
                  onPick={(url) => patch({ idPhotoFront: url })}
                />
                <IdPhotoSlot
                  label="Back"
                  hint="Tap to capture back"
                  value={draft.idPhotoBack}
                  onPick={(url) => patch({ idPhotoBack: url })}
                />
              </div>

              <div className="iz-reg-section-hd mt-4">
                <Camera className="h-4 w-4 text-[var(--iz-gold-l)]" />
                <span>Portfolio gallery</span>
              </div>
              <p className="iz-sm iz-muted -mt-1">
                Add up to {PORTFOLIO_SLOT_COUNT} photos — agencies review your gallery during sign-up approval.
              </p>
              <PortfolioGalleryPicker
                value={draft.portfolio}
                onChange={(portfolio) => patch({ portfolio })}
                onWarn={(message) => toast(message, "warn")}
                className="iz-pr-account-hero__portfolio"
              />
            </>
          )}

          {step === 5 && (
            <>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="iz-reg-profile-photo"
                  onClick={() => profilePhotoRef.current?.click()}
                >
                  {draft.profilePhoto ? (
                    <img src={draft.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-[var(--iz-muted)]" />
                  )}
                  <span className="iz-reg-profile-photo__badge">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                </button>
                <p className="iz-tiny iz-muted mt-2">Profile photo · required</p>
                <input
                  ref={profilePhotoRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readImageFile(file, (url) => patch({ profilePhoto: url }));
                    e.target.value = "";
                  }}
                />
              </div>

              <details className="iz-reg-summary-details">
                <summary className="iz-reg-summary-details__hd">
                  <span>Registration summary</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </summary>
                <dl className="iz-reg-summary-details__body">
                  <SummaryRow label="Username" value={draft.username} />
                  <SummaryRow label="Name" value={displayName} />
                  <SummaryRow label="Email" value={draft.email} />
                  <SummaryRow label="Phone" value={fullPhone} />
                  <SummaryRow label="Nationality" value={draft.nationality} />
                  <SummaryRow label="ID" value={`${draft.idType} · ${draft.idNo}`} />
                  <SummaryRow label="DOB" value={draft.dob} />
                  <SummaryRow
                    label="Address"
                    value={[draft.addressLine1, draft.addressLine2, draft.postcode, draft.state, draft.country]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <SummaryRow
                    label="Agency"
                    value={
                      draft.underAgency === false
                        ? "Freelancer — auto-assigned agency"
                        : draft.agencyId
                          ? (getPrAgencyById(draft.agencyId)?.name ?? "")
                          : ""
                    }
                  />
                </dl>
              </details>

              <RegistrationAcknowledgements draft={draft} patch={patch} />
            </>
          )}

          {step === 6 && (
            <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--iz-violet-ink)] text-[var(--iz-violet-l)]">
                <Smartphone className="h-8 w-8" strokeWidth={2} />
              </div>
              <p className="iz-sm iz-muted mt-5 max-w-[18rem] leading-relaxed">
                Enter the 6-digit OTP sent to{" "}
                <b className="text-[var(--iz-txt)]">{fullPhone}</b>
              </p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                autoFocus
                aria-label="One-time password"
                className="iz-pv-dispute-input mt-6 w-full max-w-[16rem] !min-h-0 py-3 text-center font-mono text-lg tracking-[0.35em]"
              />
              <button
                type="button"
                className="iz-tiny mt-4 text-[var(--iz-gold-l)] underline-offset-2 hover:underline"
                onClick={() => toast("OTP sent to your mobile", "info")}
              >
                Resend OTP
              </button>
            </div>
          )}
        </div>

        <div className="iz-reg-footer mt-auto flex gap-2.5 pt-4">
          <button type="button" onClick={goBack} className="iz-btn iz-btn-soft min-w-0 flex-[3]">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {step === 1 ? "Back" : "Previous"}
          </button>
          {step < 5 ? (
            <button type="button" className="iz-btn iz-btn-primary min-w-0 flex-[7]" onClick={goNext}>
              Continue <ArrowRight className="ml-1 inline h-4 w-4" />
            </button>
          ) : step === 5 ? (
            <button type="button" className="iz-btn iz-btn-primary min-w-0 flex-[7]" onClick={proceedToVerification}>
              Create account
            </button>
          ) : (
            <button type="button" className="iz-btn iz-btn-primary min-w-0 flex-[7]" onClick={verifyRegistrationOtp}>
              Verify & submit
            </button>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
