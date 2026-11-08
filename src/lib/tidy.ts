/** Client-safe types for the data clean-up tools: smart par, categories, duplicates. */

export type ParSuggestion = {
  productId: number;
  name: string;
  brand: string;
  size: string;
  current: number;
  suggested: number;
  /** Plain-language reason, e.g. "6 used in 30 days · 7-day delivery + 1 week". */
  reason: string;
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
