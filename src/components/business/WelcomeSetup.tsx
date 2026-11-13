import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { selectableBusinessTypes, type BusinessProfile } from "@/lib/business-types";
import { industryById, industrySetup } from "@/lib/industry";
import { updateBusinessProfile } from "@/server/business.functions";
import { CategorySetupSheet } from "@/components/business/CategorySetupSheet";
import { BusinessProvider } from "@/components/business/BusinessContext";
import type { ProductCategory } from "@/lib/tax-categories";
import { BinBuddy } from "@/components/assistant/AskBintro";

/**
 * The first thing a brand-new business sees. It asks the two things Bintro cannot
 * guess — what the business is called and what it does — then sets up the trade's
 * categories. Everything else is editable later in Settings, so this stays short.
 */
export function WelcomeSetup({
  profile,
  onProfile,
  onDone,
}: {
  profile: BusinessProfile;
  onProfile: (p: BusinessProfile) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [type, setType] = useState(profile.businessType || "salon");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState(false);
  const [saved, setSaved] = useState<BusinessProfile | null>(null);
  const types = selectableBusinessTypes(type);
  const setup = industrySetup(type);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setSaving(true);
    setError("");
    try {
      const saved = (await updateBusinessProfile({
        data: { name: clean, businessType: type },
      })) as BusinessProfile;
      onProfile(saved);
      setSaved(saved);
      setCategories(true);
    } catch {
      setError("Could not save that. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-page px-4 py-8 lg:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        <div className="flex items-center gap-3 mb-5">
          <BinBuddy size={52} />
          <div>
            <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-tight text-royal m-0">
              Welcome to Bintro
            </h1>
            <p className="text-ink-2 text-sm m-0">
              Two questions and you’re in. You can change both later.
            </p>
          </div>
        </div>

        <form
          onSubmit={save}
          className="bg-white border border-line rounded-2xl p-4 lg:p-5"
        >
          <label
            htmlFor="welcome-name"
            className="block text-[15px] font-bold mb-1.5"
          >
            What’s your business called?
          </label>
          <input
            id="welcome-name"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="Shag Noir Salon"
            autoComplete="organization"
            autoFocus
            required
          />

          <span className="block text-[15px] font-bold mt-5 mb-1.5">
            What do you do?
          </span>
          <p className="text-ink-2 text-[13px] mt-0 mb-2.5">
            Bintro sets itself up for your trade — the right categories, client
            records and tips.
          </p>
          <div
            className="grid grid-cols-2 min-[520px]:grid-cols-3 gap-2"
            role="group"
            aria-label="Kind of business"
          >
            {types.map((t) => {
              const on = t.id === type;
              const accent = industryById(t.id).accent;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setType(t.id)}
                  className={`relative text-left rounded-2xl border-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    on ? "bg-surface" : "border-line bg-white hover:bg-surface"
                  }`}
                  style={on ? { borderColor: accent } : undefined}
                >
                  <b className="block text-[14px] leading-tight">{t.label}</b>
                  {on && (
                    <span
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-white grid place-items-center"
                      style={{ background: accent }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {setup.length > 0 && (
            <div className="bg-surface rounded-2xl p-3.5 mt-4">
              <b className="block text-[13px] uppercase tracking-wide text-ink-2 mb-1.5">
                What you’ll get
              </b>
              <ul className="list-none m-0 p-0 grid gap-1.5">
                {setup.slice(0, 4).map((line) => (
                  <li key={line.title} className="text-[13.5px] leading-snug">
                    <b>{line.title}.</b>{" "}
                    <span className="text-ink-2">{line.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 text-sm mt-3 mb-0">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-4"
            disabled={saving || !name.trim()}
          >
            {saving ? "Setting up…" : "Set up Bintro"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="text-ink-2 text-[13px] text-center mt-4 mb-0">
          Your 30-day trial of everything has started. No card needed.
        </p>
      </div>

      {saved && (
        <BusinessProvider
          profile={saved}
          categories={[] as ProductCategory[]}
          onCategories={() => {}}
          account={null}
          onAccount={() => {}}
          openPlans={() => {}}
        >
          <CategorySetupSheet
            open={categories}
            onClose={() => {
              setCategories(false);
              onDone();
            }}
            onSaved={() => {
              setCategories(false);
              onDone();
            }}
          />
        </BusinessProvider>
      )}
    </main>
  );
}
