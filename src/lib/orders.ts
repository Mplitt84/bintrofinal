/** Client-safe types for saved purchase orders, deliveries and vendor accuracy. */
import type { ImportSummary } from "./bulk-import.js";

export type OrderStatus = "open" | "partial" | "received" | "canceled";

export type SavedOrderLine = {
  id: number;
  productId: number;
  name: string;
  brand: string;
  size: string;
  barcode: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCostCents: number;
  receivedCostCents: number;
};

export type SavedOrder = {
  id: number;
  vendor: string;
  status: OrderStatus;
  note: string;
  staffName: string;
  sentVia: string;
  createdAt: string;
  receivedAt: string | null;
  lines: SavedOrderLine[];
};

export type VendorScore = {
  vendor: string;
  orders: number;
  /** Share of ordered units that arrived (0–1). */
  fillRate: number;
  shortLines: number;
  priceChanges: number;
  /** Average days from order to delivery, null when unknown. */
  avgDays: number | null;
};

export type OrdersOverview = {
  open: SavedOrder[];
  done: SavedOrder[];
  /** Units still on order (ordered minus received) per product id. */
  onOrder: Record<number, number>;
  vendors: VendorScore[];
};

export type DeliveryResult = {
  summary: ImportSummary;
  status: OrderStatus | null;
  short: { name: string; ordered: number; received: number }[];
  priceChanges: { name: string; fromCents: number; toCents: number }[];
};
