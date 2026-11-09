const WEEK_DAYS = 7;
const SLOW_WINDOW_DAYS = 30;
const SLOW_MIN_AGE_DAYS = 30;
const SLOW_MAX_UNITS = 1;
const PRICE_STALE_DAYS = 90;
const FAST_RUNOUT_DAYS = 14;
const FAST_SURGE_RATIO = 1.5;
const FAST_MIN_WEEK_UNITS = 3;
const BULK_COVER_DAYS = 30;
const BEST_SELLER_LIMIT = 10;
const SOLD_TAX_GROUPS = ["resale", "beverage", "food"];
const SLOW_GROUP_LABELS = {
  color: "Color",
  retail: "Retail",
  other: "Other stock"
};
const WEB_PRICE_SOURCE_LABELS = {
  manufacturer: "Manufacturer",
  distributor: "Authorized distributor",
  amazon: "Amazon",
  estimate: "AI estimate (not verified online)"
};
function outVerb(kind) {
  return kind === "sold" ? "sold" : "used";
}
function isColorCategory(category, name = "") {
  return /colou?r|dye|toner|gloss|developer|lighten|bleach|tint|ink|pigment|shade/i.test(`${category} ${name}`);
}
function daysBetween(from, to = /* @__PURE__ */ new Date()) {
  return Math.floor((to.getTime() - new Date(from).getTime()) / 864e5);
}
function daysLabel(days) {
  if (days < 1) return "under a day";
  const d = Math.round(days);
  return `${d} day${d === 1 ? "" : "s"}`;
}
export {
  BULK_COVER_DAYS as B,
  FAST_MIN_WEEK_UNITS as F,
  PRICE_STALE_DAYS as P,
  SLOW_WINDOW_DAYS as S,
  WEEK_DAYS as W,
  SLOW_MAX_UNITS as a,
  SLOW_MIN_AGE_DAYS as b,
  FAST_SURGE_RATIO as c,
  daysBetween as d,
  FAST_RUNOUT_DAYS as e,
  BEST_SELLER_LIMIT as f,
  daysLabel as g,
  SLOW_GROUP_LABELS as h,
  isColorCategory as i,
  SOLD_TAX_GROUPS as j,
  WEB_PRICE_SOURCE_LABELS as k,
  outVerb as o
};
