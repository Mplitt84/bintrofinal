const SALES_REPORT_APPS = [
  "Fresha",
  "GlossGenius",
  "Mangomint",
  "Booksy",
  "Vagaro",
  "Boulevard",
  "Mindbody",
  "Zenoti",
  "Phorest",
  "Meevo",
  "Tattoo Studio Pro",
  "FlashBooker",
  "Other"
];
function salesReportNote(app, period) {
  return `Sales report: ${app}${period.trim() ? ` · ${period.trim()}` : ""}`.slice(0, 200);
}
const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
const MAX_IMPORT_LINES = 500;
const PRICE_BATCH = 25;
function needsPrice(line) {
  return !line.unitCostCents || !line.retailPriceCents;
}
export {
  MAX_IMPORT_LINES as M,
  PRICE_BATCH as P,
  SALES_REPORT_APPS as S,
  MAX_IMPORT_BYTES as a,
  needsPrice as n,
  salesReportNote as s
};
