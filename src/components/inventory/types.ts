export type Product = {
  id: number;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  vendor: string;
  size: string;
  qty: number;
  reorderThreshold: number;
  unitCostCents: number;
  retailPriceCents: number;
  squareVariationId: string;
  imageUrl: string;
  /** When cost / retail last changed or were confirmed; null = never. */
  priceUpdatedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type TeamMember = { id: number; name: string; createdAt: string | Date };

export type Expense = {
  id: number;
  spentOn: string;
  amountCents: number;
  category: string;
  vendor: string;
  note: string;
  staffName: string;
  quickbooksId: string;
  createdAt: string | Date;
};

export type MonthSpend = {
  month: string;
  budgetCents: number;
  hasOverride: boolean;
  inventoryCents: number;
  expenseCents: number;
  vendors: { vendor: string; units: number; cents: number }[];
  /** Stock received by product category (empty string = uncategorized). */
  stockCategories: { category: string; cents: number }[];
  categories: { category: string; cents: number }[];
};

export type IntegrationStatus = {
  provider: 'square' | 'quickbooks';
  configured: boolean;
  sandbox: boolean;
  connected: boolean;
  accountName: string;
  lastSyncAt: string | null;
  connectedAt: string | null;
};

export type MovementRow = {
  id: number;
  productId: number;
  type: string;
  delta: number;
  staffInitials: string;
  staffName: string;
  note: string;
  createdAt: string | Date;
  productName: string;
  productBrand: string;
  productBarcode: string;
  productImageUrl: string;
};

/** A movement with the product details the Activity tab groups and prices by. */
export type ActivityRow = {
  id: number;
  productId: number;
  type: string;
  delta: number;
  staffName: string;
  staffInitials: string;
  createdAt: string | Date;
  productName: string;
  productBrand: string;
  productSize: string;
  productImageUrl: string;
  unitCostCents: number;
};

export type Stats = {
  skuCount: number;
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  belowPar: number;
  totalValueCents: number;
};

/** Re-exported so views can keep importing order shapes from this module. */
export type { PurchaseOrderLine, PurchaseOrderGroup } from '@/lib/purchase-order';
