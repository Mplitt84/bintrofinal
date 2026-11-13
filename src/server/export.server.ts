/**
 * "Download all my data" (server-only).
 *
 * Everything the business has put into Bintro, as spreadsheets it can open
 * anywhere. The Privacy Policy promises an export on request; this is that
 * promise, self-service. Read-only — nothing here changes a thing.
 */
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  calendarEvents,
  clientFormulas,
  expenses,
  movements,
  productCategories,
  products,
  purchaseOrderLines,
  purchaseOrders,
  stockCountLines,
  stockCounts,
  teamMembers,
} from "../../db/schema.js";
import { csvMoney, toCsv } from "../lib/csv.js";
import { linesText } from "../lib/formulas.js";
import { mine } from "./tenant.js";
import { findBusinessProfile } from "./business.server.js";

export type ExportFile = { name: string; csv: string };

/** Every sheet in the download, each one a table the business would recognise. */
export async function buildExport(): Promise<{ files: ExportFile[]; profile: { name: string } }> {
  const [profile, productRows, movementRows, expenseRows, teamRows, categoryRows] =
    await Promise.all([
      findBusinessProfile(),
      db.select().from(products).where(mine(products)).orderBy(asc(products.name)),
      db
        .select({
          at: movements.createdAt,
          type: movements.type,
          delta: movements.delta,
          staffName: movements.staffName,
          note: movements.note,
          product: products.name,
          barcode: products.barcode,
          brand: products.brand,
        })
        .from(movements)
        .innerJoin(products, eq(movements.productId, products.id))
        .where(mine(movements))
        .orderBy(desc(movements.createdAt))
        .limit(50_000),
      db.select().from(expenses).where(mine(expenses)).orderBy(desc(expenses.spentOn)),
      db.select().from(teamMembers).where(mine(teamMembers)).orderBy(asc(teamMembers.name)),
      db
        .select()
        .from(productCategories)
        .where(mine(productCategories))
        .orderBy(asc(productCategories.name)),
    ]);

  const [orderRows, orderLineRows, countRows, countLineRows, visitRows, eventRows] =
    await Promise.all([
      db.select().from(purchaseOrders).where(mine(purchaseOrders)).orderBy(desc(purchaseOrders.createdAt)),
      db.select().from(purchaseOrderLines).where(mine(purchaseOrderLines)),
      db.select().from(stockCounts).where(mine(stockCounts)).orderBy(desc(stockCounts.createdAt)),
      db.select().from(stockCountLines).where(mine(stockCountLines)),
      db
        .select()
        .from(clientFormulas)
        .where(mine(clientFormulas))
        .orderBy(asc(clientFormulas.clientName), asc(clientFormulas.serviceDate)),
      db.select().from(calendarEvents).where(mine(calendarEvents)).orderBy(asc(calendarEvents.date)),
    ]);

  const orderById = new Map(orderRows.map((o) => [o.id, o]));
  const countById = new Map(countRows.map((c) => [c.id, c]));

  const files: ExportFile[] = [
    {
      name: "products.csv",
      csv: toCsv(
        [
          { key: "name", label: "Product" },
          { key: "brand", label: "Brand" },
          { key: "size", label: "Size" },
          { key: "category", label: "Category" },
          { key: "vendor", label: "Supplier" },
          { key: "barcode", label: "Barcode" },
          { key: "extra", label: "Other SKUs" },
          { key: "qty", label: "On hand" },
          { key: "par", label: "Order at" },
          { key: "fillTo", label: "Fill to" },
          { key: "pack", label: "Case pack" },
          { key: "cost", label: "Unit cost" },
          { key: "retail", label: "Retail price" },
          { key: "expiresOn", label: "Expires" },
          { key: "lastCounted", label: "Last counted" },
          { key: "lastCountedBy", label: "Last counted by" },
        ],
        productRows.map((p) => ({
          name: p.name,
          brand: p.brand,
          size: p.size,
          category: p.category,
          vendor: p.vendor,
          barcode: p.barcode,
          extra: (p.extraBarcodes ?? []).join(" "),
          qty: p.qty,
          par: p.reorderThreshold,
          fillTo: p.maxQty,
          pack: p.packSize,
          cost: csvMoney(p.unitCostCents),
          retail: csvMoney(p.retailPriceCents),
          expiresOn: p.expiresOn,
          lastCounted: p.lastCountedAt,
          lastCountedBy: p.lastCountedBy,
        })),
      ),
    },
    {
      name: "stock-history.csv",
      csv: toCsv(
        [
          { key: "at", label: "When" },
          { key: "type", label: "What" },
          { key: "delta", label: "Change" },
          { key: "product", label: "Product" },
          { key: "brand", label: "Brand" },
          { key: "barcode", label: "Barcode" },
          { key: "staffName", label: "Who" },
          { key: "note", label: "Note" },
        ],
        movementRows,
      ),
    },
    {
      name: "expenses.csv",
      csv: toCsv(
        [
          { key: "spentOn", label: "Date" },
          { key: "amount", label: "Amount" },
          { key: "category", label: "Category" },
          { key: "vendor", label: "Paid to" },
          { key: "note", label: "Note" },
          { key: "staffName", label: "Logged by" },
        ],
        expenseRows.map((e) => ({ ...e, amount: csvMoney(e.amountCents) })),
      ),
    },
    {
      name: "client-records.csv",
      csv: toCsv(
        [
          { key: "clientName", label: "Client" },
          { key: "serviceDate", label: "Date" },
          { key: "service", label: "Service" },
          { key: "practices", label: "Practices" },
          { key: "formula", label: "Products / colors" },
          { key: "developer", label: "Developer" },
          { key: "ratio", label: "Ratio" },
          { key: "processingMinutes", label: "Minutes" },
          { key: "aftercare", label: "Aftercare" },
          { key: "followUpOn", label: "Follow-up" },
          { key: "notes", label: "Notes" },
          { key: "staffName", label: "Team member" },
        ],
        visitRows.map((v) => ({
          ...v,
          practices: (v.tags ?? []).join("; "),
          formula: linesText(v.lines ?? []),
        })),
      ),
    },
    {
      name: "orders.csv",
      csv: toCsv(
        [
          { key: "order", label: "Order" },
          { key: "placed", label: "Placed" },
          { key: "vendor", label: "Supplier" },
          { key: "status", label: "Status" },
          { key: "name", label: "Product" },
          { key: "qtyOrdered", label: "Ordered" },
          { key: "qtyReceived", label: "Received" },
          { key: "cost", label: "Unit cost" },
          { key: "receivedCost", label: "Invoice cost" },
        ],
        orderLineRows.map((l) => {
          const order = orderById.get(l.orderId);
          return {
            order: l.orderId,
            placed: order?.createdAt ?? null,
            vendor: order?.vendor ?? "",
            status: order?.status ?? "",
            name: l.name,
            qtyOrdered: l.qtyOrdered,
            qtyReceived: l.qtyReceived,
            cost: csvMoney(l.unitCostCents),
            receivedCost: csvMoney(l.receivedCostCents),
          };
        }),
      ),
    },
    {
      name: "stock-counts.csv",
      csv: toCsv(
        [
          { key: "count", label: "Count" },
          { key: "when", label: "When" },
          { key: "scope", label: "Scope" },
          { key: "who", label: "Who" },
          { key: "name", label: "Product" },
          { key: "expected", label: "Bintro said" },
          { key: "counted", label: "Counted" },
          { key: "diff", label: "Difference" },
          { key: "reason", label: "Reason" },
        ],
        countLineRows.map((l) => {
          const count = countById.get(l.countId);
          return {
            count: l.countId,
            when: count?.createdAt ?? null,
            scope: count?.scope ?? "",
            who: count?.staffName ?? "",
            name: l.name,
            expected: l.expected,
            counted: l.counted,
            diff: l.diff,
            reason: l.reason,
          };
        }),
      ),
    },
    {
      name: "team.csv",
      csv: toCsv(
        [
          { key: "name", label: "Name" },
          { key: "isProvider", label: "Sees clients" },
          { key: "isAdmin", label: "Admin" },
          { key: "createdAt", label: "Added" },
        ],
        teamRows,
      ),
    },
    {
      name: "categories.csv",
      csv: toCsv(
        [
          { key: "name", label: "Category" },
          { key: "taxGroup", label: "Tax group" },
        ],
        categoryRows,
      ),
    },
    {
      name: "calendar.csv",
      csv: toCsv(
        [
          { key: "date", label: "Date" },
          { key: "startTime", label: "Time" },
          { key: "title", label: "Event" },
          { key: "kind", label: "Kind" },
          { key: "repeat", label: "Repeats" },
          { key: "notes", label: "Notes" },
        ],
        eventRows,
      ),
    },
    {
      name: "business.csv",
      csv: toCsv(
        [
          { key: "field", label: "Field" },
          { key: "value", label: "Value" },
        ],
        [
          { field: "Business name", value: profile.name },
          { field: "Kind of business", value: profile.businessType },
          { field: "Email", value: profile.email },
          { field: "Phone", value: profile.phone },
          { field: "Address", value: profile.address },
          { field: "Website", value: profile.website },
          { field: "Order email", value: profile.orderEmail },
          { field: "Monthly budget", value: csvMoney(profile.monthlyBudgetCents) },
          { field: "Exported", value: new Date().toISOString() },
        ],
      ),
    },
  ];

  return { files, profile: { name: profile.name } };
}
