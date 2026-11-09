const TAX_GROUPS = [
  {
    id: "resale",
    label: "Retail & merchandise for resale",
    why: "Products and merch clients buy and take home, including backstock waiting on the shelf. Held as inventory and expensed when sold.",
    taxLine: "Cost of goods sold · Sch. C Part III, line 36 (Purchases)",
    qbAccount: "Cost of Goods Sold",
    cogs: true
  },
  {
    id: "service",
    label: "Professional & backbar supplies",
    why: "Used up while doing the service, like color, gel, wax, ink or massage oil.",
    taxLine: "Cost of goods sold · Sch. C line 38 (Materials & supplies), or Supplies line 22",
    qbAccount: "Supplies & Materials – COGS",
    cogs: true
  },
  {
    id: "beverage",
    label: "Beverage cost",
    why: "Liquor, beer, wine and mixers poured for guests. Tracked as pour cost.",
    taxLine: "Cost of goods sold · Sch. C Part III, line 36 (Purchases)",
    qbAccount: "Cost of Goods Sold – Beverage",
    cogs: true
  },
  {
    id: "food",
    label: "Food cost",
    why: "Food and snacks that are sold to guests.",
    taxLine: "Cost of goods sold · Sch. C Part III, line 36 (Purchases)",
    qbAccount: "Cost of Goods Sold – Food",
    cogs: true
  },
  {
    id: "disposables",
    label: "Disposables & sanitation",
    why: "Single-use and cleaning items: gloves, liners, foils, disinfectant.",
    taxLine: "Supplies · Sch. C line 22",
    qbAccount: "Supplies & Materials",
    cogs: false
  },
  {
    id: "tools",
    label: "Tools & small equipment",
    why: "Reusable implements and devices. Big-ticket items may need to be depreciated.",
    taxLine: "Supplies line 22 if $2,500 or less per item; otherwise Depreciation / Sec. 179, line 13",
    qbAccount: "Small Tools & Equipment",
    cogs: false
  },
  {
    id: "linens",
    label: "Linens & laundry",
    why: "Towels, sheets, robes and capes that wear out and get replaced.",
    taxLine: "Supplies · Sch. C line 22",
    qbAccount: "Supplies & Materials",
    cogs: false
  },
  {
    id: "amenities",
    label: "Client amenities",
    why: "Complimentary drinks and treats for clients while they wait.",
    taxLine: "Other expenses · Sch. C line 27a (client amenities, not meals)",
    qbAccount: "Client Amenities",
    cogs: false
  },
  {
    id: "office",
    label: "Office supplies & front desk",
    why: "Receipt paper, gift-card stock, pens and front-desk supplies.",
    taxLine: "Office expense · Sch. C line 18",
    qbAccount: "Office Supplies & Software",
    cogs: false
  }
];
const DEFAULT_TAX_GROUP = "service";
function taxKind(group) {
  return group.cogs ? "COGS" : "Expense";
}
function taxGroupById(id) {
  return TAX_GROUPS.find((g) => g.id === id) ?? TAX_GROUPS.find((g) => g.id === DEFAULT_TAX_GROUP);
}
function isTaxGroupId(id) {
  return TAX_GROUPS.some((g) => g.id === id);
}
const fold = (v) => v.trim().toLowerCase();
function findCategory(categories, name) {
  const n = fold(name);
  return n ? categories.find((c) => fold(c.name) === n) : void 0;
}
function guessTaxGroup(name, suggestions, saved = []) {
  const own = findCategory(saved, name);
  if (own) return own.taxGroup;
  const n = fold(name);
  const exact = suggestions.find((s2) => fold(s2.name) === n);
  if (exact) return exact.group;
  if (/retail|resale|take.?home|merch/.test(n)) return "resale";
  if (/glove|liner|foil|wipe|towel.?paper|cotton|strip|spatula|barrier|disinfect|sanit|clean|cup|straw|napkin/.test(n)) return "disposables";
  if (/towel|sheet|robe|linen|blanket|cape/.test(n)) return "linens";
  if (/shear|clipper|tool|lamp|machine|brush|comb|tweezer|nipper|warmer|glassware|dryer|iron/.test(n)) return "tools";
  if (/vodka|whisk|tequila|rum|gin|liqu|wine|beer|spirit|mixer|seltzer/.test(n)) return "beverage";
  if (/food|snack|garnish/.test(n)) return "food";
  if (/coffee|tea|water|refresh|champagne/.test(n)) return "amenities";
  if (/office|paper|receipt|gift.?card|pen/.test(n)) return "office";
  return DEFAULT_TAX_GROUP;
}
const s = (group, names) => names.map((name) => ({ name, group }));
const FRONT_DESK = [
  ...s("amenities", ["Coffee, tea & water"]),
  ...s("office", ["Front desk supplies"])
];
const CATEGORY_SUGGESTIONS = {
  salon: [
    ...s("resale", ["Retail hair care", "Retail styling", "Retail tools & brushes"]),
    ...s("service", ["Hair color", "Developer", "Lightener", "Toner & gloss", "Backbar shampoo & conditioner", "Treatments & bond builders", "Perm & relaxer", "Smoothing & keratin", "Extensions"]),
    ...s("disposables", ["Foils & color wrap", "Gloves", "Neck strips", "Disinfectant"]),
    ...s("tools", ["Shears & razors", "Hot tools", "Brushes, combs & bowls", "Clips & sectioning"]),
    ...s("linens", ["Towels", "Capes"]),
    ...FRONT_DESK
  ],
  barber: [
    ...s("resale", ["Retail grooming", "Retail beard care"]),
    ...s("service", ["Shave cream & aftershave", "Pomade & styling (backbar)", "Backbar shampoo", "Hot towel products"]),
    ...s("disposables", ["Razor blades", "Neck strips", "Gloves", "Disinfectant & Barbicide"]),
    ...s("tools", ["Clippers & trimmers", "Shears", "Blades & guards", "Brushes & combs"]),
    ...s("linens", ["Towels", "Capes"]),
    ...FRONT_DESK
  ],
  nails: [
    ...s("resale", ["Retail polish", "Retail nail & hand care", "Retail press-ons"]),
    ...s("service", ["Gel polish", "Lacquer", "Base & top coat", "Acrylic powder & liquid", "Builder & hard gel", "Dip powder", "Tips & forms", "Nail art & gems", "Pedicure scrubs, soaks & masks", "Cuticle oil & lotion", "Acetone & remover"]),
    ...s("disposables", ["Files & buffers", "Pedicure liners", "Gloves & masks", "Cotton & wipes", "Toe separators & slippers", "Disinfectant"]),
    ...s("tools", ["Nippers & pushers", "E-file & bits", "UV/LED lamps", "Brushes"]),
    ...s("linens", ["Towels"]),
    ...FRONT_DESK
  ],
  brows: [
    ...s("resale", ["Retail brow & lash serums", "Retail aftercare"]),
    ...s("service", ["Lash extensions", "Lash adhesive", "Primer & remover", "Lash lift kits", "Brow tint & henna", "Brow lamination", "Hard & soft wax", "Pre & post wax care", "Threading thread"]),
    ...s("disposables", ["Micro brushes & wands", "Eye pads & tape", "Wax strips & spatulas", "Gloves", "Disinfectant"]),
    ...s("tools", ["Tweezers", "Wax warmers", "Lash lamps & beds"]),
    ...s("linens", ["Pillow covers & towels"]),
    ...FRONT_DESK
  ],
  tattoo: [
    ...s("resale", ["Retail aftercare", "Merch & apparel", "Body jewelry"]),
    ...s("service", ["Tattoo ink", "Cartridges & needles", "Stencil paper & solution", "Green soap & rinse", "Ointment & glide", "Healing film & bandages", "Numbing"]),
    ...s("disposables", ["Gloves", "Barrier film & bags", "Ink caps & cups", "Razors", "Paper towels", "Disinfectant & Cavicide"]),
    ...s("tools", ["Machines & pens", "Power supplies", "Grips & tubes"]),
    ...s("office", ["Front desk supplies"])
  ],
  spa: [
    ...s("resale", ["Retail skincare", "Retail body care", "Candles & gifts"]),
    ...s("service", ["Massage oil & lotion", "Essential oils", "Facial backbar", "Body scrubs & wraps", "Wax"]),
    ...s("disposables", ["Table paper & face covers", "Cotton & sponges", "Gloves", "Disinfectant"]),
    ...s("tools", ["Hot stones & warmers", "Steamers & devices"]),
    ...s("linens", ["Sheets & blankets", "Towels & robes", "Slippers"]),
    ...FRONT_DESK
  ],
  bar: [
    ...s("beverage", ["Vodka", "Whiskey", "Tequila", "Rum", "Gin", "Liqueur", "Wine", "Beer", "Non-alcoholic", "Mixers & juice", "Garnish"]),
    ...s("food", ["Food", "Bar snacks"]),
    ...s("disposables", ["Napkins & straws", "To-go cups", "Cleaning chemicals"]),
    ...s("tools", ["Glassware", "Bar tools"]),
    ...s("resale", ["Merch"]),
    ...s("office", ["Front desk supplies"])
  ],
  other: [
    ...s("resale", ["Retail products"]),
    ...s("service", ["Professional products"]),
    ...s("disposables", ["Disposables", "Cleaning & sanitation"]),
    ...s("tools", ["Tools & equipment"]),
    ...s("linens", ["Linens"]),
    ...FRONT_DESK
  ]
};
function categorySuggestionsFor(typeId) {
  return CATEGORY_SUGGESTIONS[typeId] ?? CATEGORY_SUGGESTIONS.other;
}
const COMMON_EXPENSES = [
  "Inventory",
  "Supplies",
  "Rent",
  "Utilities",
  "Equipment",
  "Marketing",
  "Software",
  "Repairs",
  "Licenses & permits",
  "Insurance",
  "Education",
  "Other"
];
const withExtra = (...extra) => [...COMMON_EXPENSES.slice(0, -1), ...extra, "Other"];
const SEEDS = [
  {
    id: "salon",
    label: "Hair salon",
    blurb: "Color, cuts, styling",
    itemNoun: "hair salon product",
    sizes: ["60 ml", "90 ml", "250 ml", "300 ml", "1 L", "8 oz", "33.8 oz"],
    vendorExample: "SalonCentric",
    expenseCategories: withExtra("Laundry")
  },
  {
    id: "barber",
    label: "Barbershop",
    blurb: "Cuts, fades, shaves",
    itemNoun: "barbershop product",
    sizes: ["4 oz", "8 oz", "16 oz", "1 L", "10 ct", "100 ct"],
    vendorExample: "Barber Depot",
    expenseCategories: withExtra("Laundry")
  },
  {
    id: "nails",
    label: "Nail salon",
    blurb: "Manicures, pedicures, enhancements",
    itemNoun: "nail salon product",
    sizes: ["0.5 oz", "15 ml", "1 oz", "4 oz", "16 oz", "100 ct", "500 ct"],
    vendorExample: "Nail Supply Co.",
    expenseCategories: withExtra("Laundry")
  },
  {
    id: "brows",
    label: "Brow & lash studio",
    blurb: "Brows, lashes, waxing",
    itemNoun: "brow, lash and waxing product",
    sizes: ["5 ml", "10 ml", "14 oz", "1 lb", "100 ct", "Tray"],
    vendorExample: "Lash Affair",
    expenseCategories: withExtra("Laundry")
  },
  {
    id: "tattoo",
    label: "Tattoo & piercing",
    blurb: "Tattoo, piercing, aftercare",
    itemNoun: "tattoo and piercing studio supply",
    sizes: ["1 oz", "2 oz", "4 oz", "8 oz", "20 ct", "100 ct", "Box"],
    vendorExample: "Kingpin Tattoo Supply",
    expenseCategories: withExtra("Medical waste")
  },
  {
    id: "spa",
    label: "Spa & massage",
    blurb: "Massage, facials, body",
    itemNoun: "spa and massage product",
    sizes: ["8 oz", "16 oz", "1 gal", "15 ml", "100 ml", "1 L"],
    vendorExample: "Massage Warehouse",
    expenseCategories: withExtra("Laundry")
  },
  {
    id: "bar",
    label: "Bar & lounge",
    blurb: "Liquor, beer, wine, food",
    itemNoun: "bar item (liquor, beer, wine, mixers, food supplies)",
    sizes: ["750 ml", "1 L", "1.75 L", "12 oz", "16 oz", "24 pack", "1/2 keg"],
    vendorExample: "Southern Glazer’s",
    expenseCategories: withExtra("Entertainment")
  },
  {
    id: "other",
    label: "Other beauty & wellness",
    blurb: "Med spa, makeup, tanning…",
    itemNoun: "beauty and wellness product",
    sizes: ["Each", "Box", "Case", "1 L", "16 oz"],
    vendorExample: "Costco Business",
    expenseCategories: COMMON_EXPENSES
  },
  {
    id: "retail",
    label: "Retail shop",
    blurb: "Retail",
    itemNoun: "retail store product",
    sizes: ["S", "M", "L", "XL", "One size", "Each", "6 pack"],
    vendorExample: "Faire",
    expenseCategories: withExtra("Shipping"),
    legacy: true
  },
  {
    id: "bookstore",
    label: "Bookstore",
    blurb: "Books",
    itemNoun: "book or bookstore item",
    sizes: ["Hardcover", "Paperback", "Mass market", "Board book", "Each"],
    vendorExample: "Ingram",
    expenseCategories: withExtra("Shipping", "Events"),
    legacy: true
  }
];
const BUSINESS_TYPES = SEEDS.map((t) => ({
  ...t,
  categories: categorySuggestionsFor(t.id).map((c) => c.name)
}));
function selectableBusinessTypes(currentId) {
  return BUSINESS_TYPES.filter((t) => !t.legacy || t.id === currentId);
}
function businessTypeById(id) {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? BUSINESS_TYPES.find((t) => t.id === "other");
}
const FALLBACK_BUSINESS_NAME = "My Business";
const EMPTY_PROFILE = {
  name: "",
  businessType: "salon",
  email: "",
  phone: "",
  address: "",
  website: "",
  orderEmail: "",
  monthlyBudgetCents: 0,
  weeklyReportEmail: true,
  monthlyReportEmail: true,
  fastMoverAlertEmail: true,
  palette: "burgundy-olive",
  orderEveryDays: 7
};
function displayBusinessName(profile) {
  return profile?.name.trim() || FALLBACK_BUSINESS_NAME;
}
function businessSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "bintro";
}
function monthKey(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(date = /* @__PURE__ */ new Date()) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthRange(key) {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { key, start: start.toISOString(), end: end.toISOString() };
}
function recentMonths(end, count) {
  const [y, m] = end.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => monthKey(new Date(y, m - 1 - (count - 1 - i), 1)));
}
function monthLabel(key, style = "long") {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
}
export {
  DEFAULT_TAX_GROUP as D,
  EMPTY_PROFILE as E,
  TAX_GROUPS as T,
  businessTypeById as a,
  businessSlug as b,
  categorySuggestionsFor as c,
  displayBusinessName as d,
  taxGroupById as e,
  findCategory as f,
  guessTaxGroup as g,
  monthRange as h,
  monthLabel as i,
  dayKey as j,
  isTaxGroupId as k,
  monthKey as m,
  recentMonths as r,
  selectableBusinessTypes as s,
  taxKind as t
};
