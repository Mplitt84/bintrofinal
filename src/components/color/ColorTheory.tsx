import { useState } from "react";
import { LEVELS, TONE_FAMILIES, WHEEL, complementOf } from "@/lib/color";

const R_OUT = 120;
const R_IN = 58;

function slicePath(i: number) {
  const a0 = ((i * 30 - 105) * Math.PI) / 180;
  const a1 = (((i + 1) * 30 - 105) * Math.PI) / 180;
  const p = (r: number, a: number) =>
    `${(140 + r * Math.cos(a)).toFixed(2)} ${(140 + r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(R_IN, a0)} L ${p(R_OUT, a0)} A ${R_OUT} ${R_OUT} 0 0 1 ${p(R_OUT, a1)} L ${p(R_IN, a1)} A ${R_IN} ${R_IN} 0 0 0 ${p(R_IN, a0)} Z`;
}

/** Tap a color on the wheel: the one straight across cancels it out. */
function ColorWheel() {
  const [pick, setPick] = useState(2); // orange — the classic brassy problem
  const chosen = WHEEL[pick];
  const opposite = complementOf(pick);
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h2 className="m-0 mb-1 text-[18px] font-bold">The color wheel</h2>
      <p className="text-sm text-ink-2 m-0 mb-3">
        Colors straight across from each other cancel each other out. Tap a
        color to see what neutralizes it.
      </p>
      <div className="flex flex-col min-[700px]:flex-row gap-4 items-center">
        <svg
          viewBox="0 0 280 280"
          width="260"
          height="260"
          role="img"
          aria-label="Color wheel"
        >
          {WHEEL.map((c, i) => (
            <path
              key={c.name}
              d={slicePath(i)}
              fill={c.hex}
              stroke={
                i === pick || WHEEL[(i + 6) % 12] === chosen ? "#111" : "#fff"
              }
              strokeWidth={
                i === pick || WHEEL[(i + 6) % 12] === chosen ? 3 : 1.5
              }
              className="cursor-pointer"
              onClick={() => setPick(i)}
            >
              <title>{c.name}</title>
            </path>
          ))}
          <circle cx="140" cy="140" r={R_IN - 6} fill="#fff" />
          <circle cx="122" cy="140" r="22" fill={chosen.hex} />
          <circle cx="158" cy="140" r="22" fill={opposite.hex} />
        </svg>
        <div className="text-sm min-w-0">
          <p className="m-0 text-[16px]">
            <b>{chosen.name}</b> is cancelled by{" "}
            <b>{opposite.name.toLowerCase()}</b>.
          </p>
          <ul className="mt-3 mb-0 pl-5 space-y-1.5">
            <li>
              <b>Primary</b> colors (red, yellow, blue) can’t be mixed from
              others.
            </li>
            <li>
              <b>Secondary</b> colors (orange, green, violet) are two primaries
              mixed equally.
            </li>
            <li>
              <b>Tertiary</b> colors sit between them (red-orange, blue-green…).
            </li>
            <li>
              Mixing two opposites makes brown or grey. That’s how you tone down
              a color you don’t want.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function HairLevels() {
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h2 className="m-0 mb-1 text-[18px] font-bold">
        Levels and what shows up when you lift
      </h2>
      <p className="text-sm text-ink-2 m-0 mb-3">
        Level is how light or dark (1 black to 10 lightest blonde). Lifting
        uncovers warm pigment underneath. Pick a tone that cancels it.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-[420px]:text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink-2 text-[12px]">
              <th className="py-1.5 pr-2 font-semibold">Level</th>
              <th className="py-1.5 pr-2 font-semibold">Name</th>
              <th className="py-1.5 font-semibold">
                Warmth you’ll see (typical)
              </th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.level} className="border-t border-line">
                <td className="py-1.5 pr-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full border border-line"
                      style={{ background: l.hex }}
                    />
                    <b className="num">{l.level}</b>
                  </span>
                </td>
                <td className="py-1.5 pr-2">{l.name}</td>
                <td className="py-1.5">{l.pigment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ink-2 mt-2 mb-0">
        Underlying warmth varies by person and brand; use it as a starting
        point.
      </p>
    </section>
  );
}

function ToneFamilies() {
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h2 className="m-0 mb-1 text-[18px] font-bold">
        Cool tones and warm tones
      </h2>
      <p className="text-sm text-ink-2 m-0 mb-3">
        Cool tones cancel warmth you don’t want. Warm tones add warmth back.
        Pick the tone across the wheel from the color you want to get rid of.
      </p>
      <ul className="m-0 p-0 list-none grid grid-cols-1 min-[560px]:grid-cols-2 gap-2">
        {TONE_FAMILIES.map((t) => (
          <li
            key={t.name}
            className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2"
          >
            <span
              className="w-8 h-8 rounded-full shrink-0"
              style={{ background: t.hex }}
            />
            <span className="min-w-0 text-sm">
              <b>{t.name}</b>
              <span className="block text-[12px] text-ink-2">{t.use}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ARTIST_TIPS: Record<
  "tattoo" | "makeup" | "nails" | "barber",
  { title: string; points: string[] }
> = {
  tattoo: {
    title: "For tattoo artists",
    points: [
      "Skin isn’t white paper: its undertone shows through ink. Warm skin pushes colors warmer, so cool colors can read muddier.",
      "Opposites side by side make each other pop (red next to green); mixed together they turn brown.",
      "To tone a color down without black, add a touch of its opposite instead.",
      "Cover-ups go darker, not lighter: the new color has to be deeper than the old ink.",
      "Pour small caps and add more as you go. Leftover ink in caps can’t be reused.",
    ],
  },
  makeup: {
    title: "For makeup artists and brow/lash artists",
    points: [
      "Green correctors calm redness (blemishes, flushed cheeks).",
      "Peach or orange correctors cover blue-purple under-eye circles; deeper skin usually needs deeper orange or red.",
      "Lavender brightens yellow or sallow areas.",
      "For brows, pick a shade one to two levels lighter than the hair for a softer look; ash tones keep brows from turning red.",
      "Use a spatula and palette instead of dipping into pots: less waste, cleaner product.",
    ],
  },
  nails: {
    title: "For nail artists",
    points: [
      "Opposite colors make nail art pop; neighbors on the wheel look calm and blended.",
      "A drop of white makes a tint, a drop of black makes a shade. Add it slowly, it goes a long way.",
      "Mix custom colors on a palette in small amounts and keep a swatch with the recipe for repeat clients.",
    ],
  },
  barber: {
    title: "For barbers",
    points: [
      "Grey blending: pick a level a little lighter than the darkest hair so it softens grey instead of covering it flat.",
      "Ash and matte (green-based) tones keep beards and short cuts from turning orange or red as color fades.",
      "Short cuts need far less color. Mix small and remix if needed.",
    ],
  },
};

function ArtistTips({ which }: { which: keyof typeof ARTIST_TIPS }) {
  const t = ARTIST_TIPS[which];
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h2 className="m-0 mb-2 text-[18px] font-bold">{t.title}</h2>
      <ul className="m-0 pl-5 space-y-1.5 text-sm">
        {t.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </section>
  );
}

/** Color theory for every color artist; hair businesses also get levels and tone families. */
export function ColorTheory({ businessType }: { businessType: string }) {
  const hair =
    businessType === "salon" ||
    businessType === "barber" ||
    businessType === "other";
  const primary: (keyof typeof ARTIST_TIPS)[] =
    businessType === "tattoo"
      ? ["tattoo"]
      : businessType === "brows" || businessType === "spa"
        ? ["makeup"]
        : businessType === "nails"
          ? ["nails"]
          : businessType === "barber"
            ? ["barber"]
            : [];
  const others = (
    Object.keys(ARTIST_TIPS) as (keyof typeof ARTIST_TIPS)[]
  ).filter((k) => !primary.includes(k));
  return (
    <div className="space-y-4">
      <ColorWheel />
      {primary.map((k) => (
        <ArtistTips key={k} which={k} />
      ))}
      {hair && <HairLevels />}
      {hair && <ToneFamilies />}
      <details className="bg-surface rounded-2xl p-4">
        <summary className="cursor-pointer font-semibold">
          Color tips for other artists
        </summary>
        <div className="space-y-3 mt-3">
          {others.map((k) => (
            <ArtistTips key={k} which={k} />
          ))}
        </div>
      </details>
    </div>
  );
}
