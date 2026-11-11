import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  CalendarDays,
  Check,
  Eye,
  Flower2,
  Hand,
  Palette,
  PenTool,
  ScanBarcode,
  Scissors,
  Sparkles,
  SquareScissors,
  Store,
  Truck,
  Wallet,
  Wine,
} from "lucide-react";
import { updateBusinessProfile } from "@/server/business.functions";
import { useToast } from "@/components/ui/Toast";
import { CategorySetupSheet } from "@/components/business/CategorySetupSheet";
import {
  businessTypeById,
  selectableBusinessTypes,
  type BusinessProfile,
} from "@/lib/business-types";
import { industryById, industrySetup, recordSpecFor } from "@/lib/industry";

const ICONS: Record<string, typeof Scissors> = {
  salon: Scissors,
  barber: SquareScissors,
  nails: Hand,
  brows: Eye,
  tattoo: PenTool,
  spa: Flower2,
  bar: Wine,
  other: Sparkles,
};

/** The menu this industry will see, in order, for the small preview strip. */
function menuFor(id: string) {
  const records = recordSpecFor(id);
  return [
    { label: "Scan", Icon: ScanBarcode, own: false },
    { label: "Products", Icon: Boxes, own: false },
    { label: "Restock", Icon: Truck, own: false },
    ...(records ? [{ label: records.tabLabel, Icon: Palette, own: true }] : []),
    { label: "Calendar", Icon: CalendarDays, own: false },
    { label: "Budget", Icon: Wallet, own: false },
    { label: "Activity", Icon: Activity, own: false },
  ];
}

/**
 * Settings → Business profile: pick the industry and see exactly what Bintro sets up for it
 * before switching. Saves on its own (not part of the profile form below it).
 */
export function IndustryPicker({
  profile,
  onProfile,
  productCategories,
}: {
  profile: BusinessProfile;
  onProfile: (p: BusinessProfile) => void;
  productCategories: string[];
}) {
  const toast = useToast();
  const [pick, setPick] = useState(profile.businessType);
  const [saving, setSaving] = useState(false);
  const [justSet, setJustSet] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setPick(profile.businessType), [profile.businessType]);

  const type = businessTypeById(pick);
  const industry = industryById(pick);
  const Icon = ICONS[pick] ?? Store;
  const isCurrent = pick === profile.businessType;
  const setup = industrySetup(pick);
  const menu = menuFor(pick);

  async function apply() {
    setSaving(true);
    setError("");
    try {
      const saved = (await updateBusinessProfile({
        data: { businessType: pick },
      })) as BusinessProfile;
      onProfile(saved);
      setJustSet(true);
      toast(`Bintro is set up for a ${type.label.toLowerCase()}`);
      // A new industry is the moment to pick the categories that fit it.
      setTimeout(() => setSetupOpen(true), 900);
    } catch {
      setError("Couldn’t switch. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6" aria-labelledby="industry-title">
      <h2
        id="industry-title"
        className="m-0 text-[20px] font-bold tracking-tight"
      >
        Your industry
      </h2>
      <p className="text-ink-2 text-sm mt-0.5 mb-3">
        Pick what you do. Bintro sets up its pages, words and tips to match.
      </p>

      <div
        className="grid grid-cols-2 min-[560px]:grid-cols-4 gap-2.5"
        role="radiogroup"
        aria-label="Industry"
      >
        {selectableBusinessTypes(profile.businessType).map((t) => {
          const on = pick === t.id;
          const current = profile.businessType === t.id;
          const accent = industryById(t.id).accent;
          const TIcon = ICONS[t.id] ?? Store;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setPick(t.id);
                setJustSet(false);
              }}
              className={`industry-card relative text-left bg-white rounded-2xl p-3 cursor-pointer border-2 transition-all ${
                on
                  ? "shadow-md -translate-y-0.5"
                  : "border-line hover:border-ink-2/40"
              }`}
              style={on ? { borderColor: accent } : undefined}
            >
              <span
                className="w-10 h-10 rounded-xl grid place-items-center mb-2 transition-colors"
                style={{
                  background: on ? accent : `${accent}1a`,
                  color: on ? "#fff" : accent,
                }}
              >
                <TIcon size={20} />
              </span>
              <b className="block text-[14px] leading-tight">{t.label}</b>
              <span className="block text-[12px] text-ink-2 mt-0.5">
                {t.legacy ? "No longer offered" : t.blurb}
              </span>
              {current && (
                <span
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: accent }}
                >
                  Current
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        key={pick}
        className="industry-preview mt-3 rounded-2xl overflow-hidden border border-line bg-white"
        aria-live="polite"
      >
        <div
          className="px-4 py-4 text-white flex items-center gap-3"
          style={{ background: industry.accent }}
        >
          <span className="w-12 h-12 rounded-2xl bg-white/15 grid place-items-center shrink-0">
            <Icon size={24} />
          </span>
          <span className="min-w-0">
            <b className="block text-[17px] leading-tight">
              Bintro for a {type.label.toLowerCase()}
            </b>
            <span className="block text-[13px] text-white/85">
              {industry.pitch}
            </span>
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 gap-4 min-[860px]:grid-cols-[1fr_260px]">
          <ul className="m-0 p-0 list-none space-y-2.5">
            {setup.map((line) => (
              <li key={line.title} className="flex gap-2.5">
                <span
                  className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5 text-white"
                  style={{ background: industry.accent }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-sm min-w-0">
                  <b>{line.title}</b>
                  <span className="block text-ink-2 text-[13px]">
                    {line.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div>
            <span className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">
              Your menu
            </span>
            <ul className="m-0 p-1.5 list-none bg-surface rounded-2xl space-y-0.5">
              {menu.map((m) => (
                <li
                  key={m.label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] font-semibold ${m.own ? "text-white" : "text-ink-2"}`}
                  style={m.own ? { background: industry.accent } : undefined}
                >
                  <m.Icon size={15} /> {m.label}
                  {m.own && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wide opacity-90">
                      Yours
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-4 pb-4">
          {error && (
            <p className="bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 text-sm mb-2">
              {error}
            </p>
          )}
          {isCurrent ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: industry.accent }}
              >
                <Check size={16} strokeWidth={3} />{" "}
                {justSet
                  ? "All set. Your menu and pages just updated."
                  : `You’re set up for a ${type.label.toLowerCase()}.`}
              </span>
              <button
                type="button"
                className="btn btn-text btn-sm !px-0"
                onClick={() => setSetupOpen(true)}
              >
                Review starter categories
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn w-full text-white font-bold border-0"
                style={{ background: industry.accent }}
                disabled={saving}
                onClick={apply}
              >
                {saving
                  ? "Setting up…"
                  : `Set up Bintro for a ${type.label.toLowerCase()}`}
              </button>
              <p className="text-[12px] text-ink-2 text-center mt-2 mb-0">
                Your products, counts and history stay exactly as they are. You
                can switch back any time.
              </p>
            </>
          )}
        </div>
      </div>

      <CategorySetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        productCategories={productCategories}
      />
    </section>
  );
}
