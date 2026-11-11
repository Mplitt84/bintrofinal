/**
 * Industry setup (client-safe): what Bintro changes for each kind of business.
 * One source for the Settings picker's preview, the client-records tab (name, fields, services)
 * and whether Color theory sits in that tab. Tips, category starters, sizes and connections are
 * already keyed by business type elsewhere; `industrySetup()` gathers them for the preview.
 */
import { businessTypeById } from "./business-types";
import { categorySuggestionsFor } from "./tax-categories";
import { directoryFor } from "./connection-directory";
import { TIPS } from "./tips";

/** How the client-records tab is worded and which fields it shows. null = no client records (bars). */
export type TagGroup = { label: string; options: string[] }

export type RecordSpec = {
  tabLabel: string;
  lead: string;
  /** "after each ___" in the empty state. */
  visitNoun: string;
  /** What the main list is called on a saved visit, and on the form. */
  linesHeading: string;
  linesLabel: string;
  itemPlaceholder: string;
  amountPlaceholder: string;
  addLabel: string;
  serviceLabel: string;
  /** Pick-list of services; null = free text. */
  services: string[] | null;
  servicePlaceholder: string;
  /** Developer / ratio / minutes / leftover row (hair color). */
  mix: boolean;
  aftercare: boolean;
  followUpLabel: string;
  /** Tap-to-select practices for a visit, grouped (treatments, styles, skin notes…). */
  /** What a team member who sees clients is called: Stylist, Barber, Artist… */
  providerNoun: string;
  tagGroups: TagGroup[];
  notesPlaceholder: string;
};

export type Industry = {
  id: string;
  /** Fixed card color in the picker (not a theme token: each industry keeps its color in every palette). */
  accent: string;
  /** One line: what Bintro becomes for them. */
  pitch: string;
  records: RecordSpec | null;
};

const HAIR: RecordSpec = {
  tabLabel: "Formulas",
  lead: "Every client’s color formula and take-home products, saved so nothing is ever lost.",
  visitNoun: "color service",
  linesHeading: "Formula",
  linesLabel: "Formula (product / shade and amount)",
  itemPlaceholder: "e.g. 7N",
  amountPlaceholder: "30 g",
  addLabel: "a product",
  serviceLabel: "Service",
  services: [
    "Root touch-up",
    "All-over color",
    "Toner / gloss",
    "Highlights",
    "Balayage",
    "Lowlights",
    "Grey blending",
    "Color correction",
  ],
  servicePlaceholder: "",
  mix: true,
  aftercare: false,
  followUpLabel: "",
  providerNoun: "Stylist",
      tagGroups: [
    { label: 'Technique', options: ['Single process', 'Foils', 'Balayage', 'Foilyage', 'Color melt', 'Gloss', 'Bleach & tone', 'Grey coverage', 'Color correction'] },
    { label: 'Hair notes', options: ['Curly / coily', 'Fine', 'Coarse', 'Resistant grey', 'High porosity', 'Low porosity', 'Previously colored', 'Box dye history', 'Sensitive scalp'] },
  ],
      notesPlaceholder: "Porosity, grey %, what you’d change next time",
};

export const INDUSTRIES: Industry[] = [
  {
    id: "salon",
    accent: "#8a1c3a",
    pitch: "Color formulas, backbar use and retail, all in one place.",
    records: HAIR,
  },
  {
    id: "barber",
    accent: "#1f3a5f",
    pitch: "Client cut cards, clipper supplies and retail you style with.",
    records: {
      ...HAIR,
      tabLabel: "Clients",
      lead: "Every client’s cut, guards, color and take-home products, saved so any barber can pick up where the last visit left off.",
      visitNoun: "cut",
      linesHeading: "Cut and products",
      linesLabel: "Cut details and products (guard, blend, color)",
      itemPlaceholder: "e.g. Sides, skin fade",
      amountPlaceholder: "#1.5",
      addLabel: "a line",
      services: [
        "Haircut",
        "Fade",
        "Cut & beard",
        "Beard trim",
        "Hot towel shave",
        "Grey blending",
        "Kids cut",
      ],
      providerNoun: "Barber",
      tagGroups: [
        { label: 'Cut', options: ['Skin fade', 'Low fade', 'Mid fade', 'High fade', 'Taper', 'Scissor cut', 'Buzz cut', 'Line-up', 'Beard shape-up', 'Hot towel shave', 'Design'] },
        { label: 'Hair & skin notes', options: ['Curly / coily', 'Cowlick', 'Thinning', 'Sensitive skin', 'Razor bumps', 'Ingrown hairs'] },
      ],
      notesPlaceholder: "Cowlicks, part side, how short they like it",
    },
  },
  {
    id: "nails",
    accent: "#c2417a",
    pitch: "Client color cards, sets and fills, and supplies by the bottle.",
    records: {
      ...HAIR,
      tabLabel: "Clients",
      lead: "Every client’s colors, shape and products, saved so their next set matches.",
      visitNoun: "set",
      linesHeading: "Colors and products",
      linesLabel: "Colors and products used (brand and shade)",
      itemPlaceholder: "e.g. Gel, Rose Nude",
      amountPlaceholder: "optional",
      addLabel: "a color",
      services: [
        "Gel manicure",
        "Classic manicure",
        "Pedicure",
        "Acrylic full set",
        "Acrylic fill",
        "Builder gel",
        "Dip powder",
        "Nail art",
      ],
      mix: false,
      providerNoun: "Nail tech",
      tagGroups: [
        { label: 'Service type', options: ['Gel', 'Acrylic', 'Builder gel', 'Dip powder', 'Regular polish', 'Gel-X / tips', 'French', 'Chrome', 'Ombré', 'Nail art'] },
        { label: 'Shape', options: ['Square', 'Round', 'Oval', 'Almond', 'Coffin', 'Stiletto', 'Squoval'] },
        { label: 'Nail notes', options: ['Thin nails', 'Lifting', 'Nail biter', 'Sensitive cuticles', 'Product sensitivity'] },
      ],
      notesPlaceholder: "Shape, length, sensitivities, nail art notes",
    },
  },
  {
    id: "brows",
    accent: "#6b4a8c",
    pitch: "Lash maps, brow tint mixes and aftercare for every client.",
    records: {
      ...HAIR,
      tabLabel: "Clients",
      lead: "Every client’s lash map, tint mix and aftercare, saved so fills match the full set.",
      visitNoun: "appointment",
      linesHeading: "Map and products",
      linesLabel: "Lash map / tint and products (curl, length, shade)",
      itemPlaceholder: "e.g. CC curl 0.07",
      amountPlaceholder: "10–13 mm",
      addLabel: "a line",
      services: [
        "Lash full set",
        "Lash fill",
        "Lash lift & tint",
        "Brow lamination",
        "Brow tint",
        "Brow wax / shape",
        "Waxing",
      ],
      mix: false,
      aftercare: true,
      followUpLabel: "Next fill / check",
      providerNoun: "Lash & brow artist",
      tagGroups: [
        { label: 'Lash style', options: ['Classic', 'Hybrid', 'Volume', 'Mega volume', 'Wispy', 'Cat eye', 'Doll eye', 'Natural'] },
        { label: 'Brow service', options: ['Tint', 'Lamination', 'Wax', 'Thread', 'Henna', 'Shape'] },
        { label: 'Notes', options: ['Sensitive eyes', 'Sensitive skin', 'Adhesive sensitivity', 'Patch test done', 'Oily lids', 'Sparse natural lashes'] },
      ],
      notesPlaceholder: "Sensitivities, patch test date, retention notes",
    },
  },
  {
    id: "tattoo",
    accent: "#22262e",
    pitch: "Ink log, placement and aftercare for every piece.",
    records: {
      tabLabel: "Ink log",
      lead: "Every client’s colors, placement and aftercare, saved so nothing is ever lost.",
      visitNoun: "tattoo",
      linesHeading: "Colors used",
      linesLabel: "Colors used (ink brand and color)",
      itemPlaceholder: "e.g. Dynamic Black",
      amountPlaceholder: "optional",
      addLabel: "a color",
      serviceLabel: "Piece and placement",
      services: null,
      servicePlaceholder: "e.g. Rose, left forearm",
      mix: false,
      aftercare: true,
      followUpLabel: "Touch-up / healing check",
      providerNoun: "Artist",
      tagGroups: [
        { label: 'Style', options: ['Traditional', 'Neo-traditional', 'Fine line', 'Black and grey', 'Blackwork', 'Color', 'Realism', 'Japanese', 'Script / lettering', 'Watercolor', 'Dotwork', 'Tribal', 'Freehand', 'Flash', 'Cover-up', 'Touch-up'] },
        { label: 'Skin notes', options: ['Keloid-prone skin', 'Sensitive skin', 'Scar tissue', 'Stretch marks', 'Sun-damaged skin', 'Deeper skin tone', 'Very fair skin', 'Heavy bleeder', 'Dry skin'] },
      ],
      notesPlaceholder: "Skin, needle, how it healed last time",
    },
  },
  {
    id: "spa",
    accent: "#2f7a6b",
    pitch: "Treatment notes, product lots and home-care for every client.",
    records: {
      ...HAIR,
      tabLabel: "Clients",
      lead: "Every client’s treatments, products used and home-care, saved for the next visit.",
      visitNoun: "treatment",
      linesHeading: "Products used",
      linesLabel: "Products used (product and amount or lot)",
      itemPlaceholder: "e.g. Enzyme peel",
      amountPlaceholder: "amount / lot",
      addLabel: "a product",
      services: [
        "Facial",
        "Massage",
        "Chemical peel",
        "Microneedling",
        "Body treatment",
        "Waxing",
        "Injectable / filler",
        "Laser",
      ],
      mix: false,
      aftercare: true,
      followUpLabel: "Follow-up",
      providerNoun: "Service provider",
      tagGroups: [
        { label: 'Facial & skin treatments', options: ['Hydrating facial', 'Hydrodermabrasion', 'Extractions', 'Dermaplaning', 'Chemical peel', 'Microneedling', 'LED light therapy', 'Microdermabrasion', 'Enzyme treatment', 'Lymphatic facial'] },
        { label: 'Massage', options: ['Swedish', 'Deep tissue', 'Sports', 'Hot stone', 'Prenatal', 'Lymphatic drainage', 'Trigger point', 'Myofascial release', 'Reflexology', 'Aromatherapy', 'Cupping'] },
        { label: 'Skin & client notes', options: ['Sensitive skin', 'Acne-prone', 'Dry skin', 'Oily skin', 'Combination skin', 'Rosacea', 'Hyperpigmentation', 'Mature skin', 'Firm pressure', 'Light pressure'] },
      ],
      notesPlaceholder: "Skin type, sensitivities, how they responded",
    },
  },
  {
    id: "bar",
    accent: "#9a5b13",
    pitch: "Bottles, kegs and mixers, counted fast.",
    records: null,
  },
  {
    id: "other",
    accent: "#55606e",
    pitch:
      "Stock, orders and client records for any beauty or wellness business.",
    records: HAIR,
  },
];

export function industryById(id: string): Industry {
  return (
    INDUSTRIES.find((i) => i.id === id) ?? {
      id,
      accent: "#55606e",
      pitch: "",
      records: null,
    }
  );
}

export function recordSpecFor(businessType: string): RecordSpec | null {
  return industryById(businessType).records;
}

/** Color theory sits in the client-records tab only for salons and tattoo shops; everyone finds it in Settings. */
export function showsColorTheoryTab(businessType: string) {
  return businessType === "salon" || businessType === "tattoo";
}

export type SetupLine = { title: string; detail: string };

/** What switching to this industry sets up, in plain words, for the picker's preview. All real, nothing aspirational. */
export function industrySetup(id: string): SetupLine[] {
  const type = businessTypeById(id);
  const spec = recordSpecFor(id);
  const cats = categorySuggestionsFor(id).map((c) => c.name);
  const tips = TIPS.filter(
    (t) =>
      t.audience === id ||
      (t.audience === "hair" && (id === "salon" || id === "barber")),
  );
  const apps = directoryFor(id)
    .filter((e) => e.types.includes(id))
    .map((e) => e.name);
  const lines: SetupLine[] = [];
  if (spec) {
    lines.push({
      title: `${spec.tabLabel} tab`,
      detail: `${spec.linesHeading}${spec.mix ? ", developer, ratio and timing" : ""}${spec.aftercare ? ", aftercare" : ""}, take-home products and before/after photos for each client.`,
    });
    if (spec.tagGroups.length)
      lines.push({
        title: "Tap-to-pick practices",
        detail: `${spec.tagGroups.map((g) => g.label).join(", ")}: ${spec.tagGroups
          .flatMap((g) => g.options.slice(0, 2))
          .slice(0, 6)
          .join(", ")} and more, one tap each on every visit.`,
      });
  } else {
    lines.push({
      title: "A simpler menu",
      detail:
        "No client-records tab: just Scan, Products, Restock, Calendar, Budget and Activity.",
    });
  }
  if (showsColorTheoryTab(id))
    lines.push({
      title: "Color theory",
      detail: `The color wheel and color basics sit inside ${spec?.tabLabel ?? "your records tab"}.`,
    });
  if (cats.length)
    lines.push({
      title: "Starter categories",
      detail: `${cats.slice(0, 5).join(", ")}${cats.length > 5 ? ` and ${cats.length - 5} more` : ""}, each filed under the right tax line.`,
    });
  lines.push({
    title: "Sizes and suppliers",
    detail: `Size shortcuts like ${type.sizes.slice(0, 3).join(", ")}; AI reads labels and checks prices as a ${type.label.toLowerCase()} would buy them.`,
  });
  if (tips.length)
    lines.push({
      title: `${tips.length} tips for your trade`,
      detail: tips
        .slice(0, 2)
        .map((t) => t.title)
        .join(" · "),
    });
  if (apps.length)
    lines.push({
      title: "Apps you likely use",
      detail: `${apps.slice(0, 4).join(", ")} listed under Connections.`,
    });
  return lines;
}

/** What this business calls a team member who sees clients (Stylist, Barber, Artist, Service provider…). */
export function providerNounFor(type: string): string {
  return recordSpecFor(type)?.providerNoun ?? "Service provider";
}
