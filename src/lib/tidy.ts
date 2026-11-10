/** Client-safe types for the data clean-up tools: smart par, categories, duplicates. */

export type ParSuggestion = {
  productId: number;
  name: string;
  brand: string;
  size: string;
  /** Reorder at (par) now and suggested. */
  current: number;
  suggested: number;
  /** Order up to now and suggested (0 = order back to par). */
  currentMax: number;
  suggestedMax: number;
  /** Units per case, used to round "Order up to". */
  packSize: number;
  /** Average units used or sold per day. */
  perDay: number;
  /** Plain words (third-grade level), e.g. "You use about 1 a day · orders from SalonCentric take about 5 days · you use about the same each week". */
  reason: string;
};

/** Stock sitting well above "Order up to": cash tied up on the shelf. */
export type Overstock = {
  productId: number;
  name: string;
  onHand: number;
  /** Days the shelf would last at the current pace. */
  daysOfStock: number;
  /** Cost of the units above "Order up to". */
  extraCents: number;
};

/** The latest Smart par apply that can still be undone. */
export type ParChangeSummary = { batchId: string; at: string; products: number; staffName: string };

export type SmartParResult = {
  suggestions: ParSuggestion[];
  overstock: Overstock[];
  orderEveryDays: number;
  /** Latest apply that can be undone. */
  lastChange: ParChangeSummary | null;
};

export type CategoryGroup = {
  /** Spellings of one category, most-used first. */
  names: { name: string; products: number }[];
  total: number;
};

export type DuplicateGroup = {
  /** Likely the same product; the first is the suggested one to keep. */
  products: {
    id: number;
    name: string;
    brand: string;
    size: string;
    category: string;
    vendor: string;
    qty: number;
    barcode: string;
    linkedToSquare: boolean;
  }[];
};
