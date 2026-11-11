import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  EyeOff,
  Info,
  Pencil,
  TrendingDown,
  TrendingUp,
  Undo2,
} from "lucide-react";
import {
  getProfitReport,
  putBackProfitRow,
  removeProfitRow,
} from "@/server/profit.functions";
import {
  deleteProduct,
  mergeProducts,
  setProductBarcode,
  updateProduct,
} from "@/server/inventory.functions";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ProductForm } from "@/components/inventory/ProductForm";
import type { Product } from "@/components/inventory/types";
import {
  centsToDollars,
  dollarsShort,
  EmptyState,
  PageHead,
  StatGrid,
  StatTile,
  Thumb,
} from "@/components/ui/bits";
import type {
  LoserKind,
  ProductRef,
  ProfitListKey,
  ProfitPeriod,
  ProfitReport,
} from "@/lib/profit";

/** The row the user tapped: which product, on which list, and what it said. */
type Picked = ProductRef & { key: ProfitListKey; summary: string };

const LIST_LABEL = (key: ProfitListKey) =>
  key === "maker"
    ? "Making you money"
    : key === "service"
      ? "What your services use"
      : KIND_LABEL[key];

const usd = (cents: number) => `$${centsToDollars(cents)}`;

const PERIODS: { days: ProfitPeriod; label: string }[] = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

const KIND_LABEL: Record<LoserKind, string> = {
  loss: "Sold at a loss",
  thin: "Thin profit",
  dead: "Not moving",
  overstock: "Too much on hand",
  shrink: "Lost or missing",
  expired: "Expired",
  expiring: "Expiring soon",
};

const KIND_TONE: Record<LoserKind, string> = {
  loss: "bg-bad-tint text-bad",
  shrink: "bg-bad-tint text-bad",
  expired: "bg-bad-tint text-bad",
  thin: "bg-warn-tint text-warn",
  dead: "bg-warn-tint text-warn",
  overstock: "bg-warn-tint text-warn",
  expiring: "bg-warn-tint text-warn",
};

/** What each loser amount means, shown next to the dollar figure. */
const AMOUNT_NOTE: Record<LoserKind, string> = {
  loss: "lost",
  thin: "left on the table",
  dead: "tied up",
  overstock: "tied up",
  shrink: "lost",
  expired: "lost",
  expiring: "at risk",
};

const name = (p: { brand: string; name: string; size: string }) =>
  [p.brand, p.name, p.size].filter(Boolean).join(" · ");

/** Activity tab → Profit: what's making money, what's costing money, and what data is missing. */
export function ProfitView({
  products,
  staffName,
  onProduct,
  onChanged,
  onOpenProducts,
}: {
  products: Product[];
  staffName: string;
  onProduct?: (product: Product) => void;
  onChanged: () => Promise<void> | void;
  onOpenProducts?: () => void;
}) {
  const toast = useToast();
  const [reload, setReload] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  async function removeRow(row: Picked) {
    setBusy(true);
    try {
      await removeProfitRow({
        data: { productId: row.productId, key: row.key, staffName },
      });
      setPicked(null);
      setReload((n) => n + 1);
      toast(`Removed ${row.name} from this report`);
    } catch {
      toast("Couldn’t remove that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function putBack(row: ProductRef & { key: ProfitListKey }) {
    try {
      await putBackProfitRow({
        data: { productId: row.productId, key: row.key, staffName },
      });
      setReload((n) => n + 1);
      toast(`Put ${row.name} back`);
    } catch {
      toast("Couldn’t put that back. Check your connection and try again.");
    }
  }

  const [days, setDays] = useState<ProfitPeriod>(90);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [error, setError] = useState("");
  const [showAllLosers, setShowAllLosers] = useState(false);

  useEffect(() => {
    let live = true;
    setError("");
    getProfitReport({ data: { days } })
      .then((r) => live && setReport(r))
      .catch(
        () =>
          live &&
          setError("Couldn’t load the numbers. Pull down or try again."),
      );
    return () => {
      live = false;
    };
  }, [days, reload]);

  const losers = report
    ? showAllLosers
      ? report.losers
      : report.losers.slice(0, 10)
    : [];
  const gapCount = report
    ? report.gaps.soldNoCost.length + report.gaps.soldNoRetail.length
    : 0;

  return (
    <>
      <PageHead
        title="Profit"
        lead="Which products make you money, which ones cost you money, and why."
      />
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Period"
      >
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            className="chip"
            aria-pressed={days === p.days}
            onClick={() => {
              setReport(null);
              setDays(p.days);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}
      {!report && !error && <div className="skel h-40 rounded-2xl" />}
      {report && (
        <p className="text-[13px] text-ink-2 m-0 mb-3">
          Something look wrong? Tap any product below to correct it or remove
          it from the report.
        </p>
      )}

      {report && (
        <>
          <StatGrid>
            <StatTile
              label={`Profit on retail sold (${report.totals.marginPct}% kept)`}
              value={dollarsShort(report.totals.profitCents)}
              tone="good"
            />
            <StatTile
              label="Lost to missing, damage & theft"
              value={dollarsShort(report.totals.shrinkCents)}
              tone={report.totals.shrinkCents ? "bad" : undefined}
            />
            <StatTile
              label="Cash sitting in stock that isn’t moving"
              value={dollarsShort(
                report.totals.deadStockCents + report.totals.overstockCents,
              )}
              tone={
                report.totals.deadStockCents + report.totals.overstockCents
                  ? "warn"
                  : undefined
              }
            />
            <StatTile
              label="Products used on clients"
              value={dollarsShort(report.totals.usedCostCents)}
            />
          </StatGrid>

          {gapCount > 0 && (
            <div className="flex gap-2.5 bg-warn-tint rounded-2xl px-4 py-3 mb-5 text-sm">
              <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
              <div>
                <b>
                  {gapCount} sold product{gapCount === 1 ? " is" : "s are"} left
                  out because a price is missing.
                </b>{" "}
                {report.gaps.soldNoCost.length > 0 && (
                  <>
                    No cost:{" "}
                    {report.gaps.soldNoCost.slice(0, 4).map(name).join(", ")}
                    {report.gaps.soldNoCost.length > 4 ? "…" : ""}.{" "}
                  </>
                )}
                {report.gaps.soldNoRetail.length > 0 && (
                  <>
                    No retail price:{" "}
                    {report.gaps.soldNoRetail.slice(0, 4).map(name).join(", ")}
                    {report.gaps.soldNoRetail.length > 4 ? "…" : ""}.{" "}
                  </>
                )}
                {onOpenProducts && (
                  <button
                    type="button"
                    className="btn btn-text btn-sm !px-0 !py-0 align-baseline"
                    onClick={onOpenProducts}
                  >
                    Add prices in Products
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 min-[1060px]:grid-cols-2 min-[1060px]:items-start">
            <section className="min-w-0">
              <h2 className="flex items-center gap-2 text-[18px] font-bold m-0 mb-2">
                <TrendingUp size={20} className="text-good" /> Making you money
              </h2>
              {report.makers.length === 0 ? (
                <EmptyState title="No retail sales with prices yet">
                  Scan out sales (or connect Square) and add a cost and retail
                  price to each product you sell.
                </EmptyState>
              ) : (
                <ul className="m-0 p-0 list-none bg-white border border-line rounded-2xl divide-y divide-line">
                  {report.makers.map((m, i) => (
                    <li key={m.productId}>
                    <button
                      type="button"
                      data-profit-row="maker"
                      className="w-full text-left flex items-center gap-3 px-3.5 py-3 bg-transparent border-0 cursor-pointer hover:bg-surface"
                      onClick={() =>
                        setPicked({
                          ...m,
                          key: "maker",
                          summary: `${m.units} sold · ${usd(m.revenueCents)} in sales · ${usd(m.profitCents)} profit (keep ${m.marginPct}%)`,
                        })
                      }
                    >
                      <span className="num w-5 text-[13px] text-ink-2 text-right shrink-0">
                        {i + 1}
                      </span>
                      <Thumb imageUrl={m.imageUrl} label={m.brand || m.name} />
                      <span className="flex-1 min-w-0">
                        <b className="block truncate text-[15px]">{name(m)}</b>
                        <span className="text-[13px] text-ink-2">
                          {m.units} sold · {usd(m.revenueCents)} in
                          sales · keep {m.marginPct}%
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <b className="num block text-good">
                          +{usd(m.profitCents)}
                        </b>
                        <span className="text-[11px] text-ink-2">profit</span>
                      </span>
                      <ChevronRight size={16} className="text-ink-2 shrink-0" />
                    </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="min-w-0">
              <h2 className="flex items-center gap-2 text-[18px] font-bold m-0 mb-2">
                <TrendingDown size={20} className="text-bad" /> Costing you
                money
              </h2>
              {report.losers.length === 0 ? (
                <EmptyState title="Nothing costing you money right now">
                  No losses, missing stock, expired items or stuck stock found
                  for this period.
                </EmptyState>
              ) : (
                <>
                  <ul className="m-0 p-0 list-none bg-white border border-line rounded-2xl divide-y divide-line">
                    {losers.map((l, i) => (
                      <li key={`${l.kind}-${l.productId}-${i}`}>
                      <button
                        type="button"
                        data-profit-row={l.kind}
                        className="w-full text-left flex items-start gap-3 px-3.5 py-3 bg-transparent border-0 cursor-pointer hover:bg-surface"
                        onClick={() =>
                          setPicked({
                            ...l,
                            key: l.kind,
                            summary: `${l.why} ${usd(l.amountCents)} ${AMOUNT_NOTE[l.kind]}.`,
                          })
                        }
                      >
                        <Thumb
                          imageUrl={l.imageUrl}
                          label={l.brand || l.name}
                        />
                        <span className="flex-1 min-w-0">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold mb-1 ${KIND_TONE[l.kind]}`}
                          >
                            {KIND_LABEL[l.kind]}
                          </span>
                          <b className="block truncate text-[15px]">
                            {name(l)}
                          </b>
                          <span className="block text-[13px] text-ink-2">
                            {l.why}
                          </span>
                          <span className="block text-[13px] text-ink mt-0.5">
                            <b>Fix:</b> {l.fix}
                          </span>
                        </span>
                        <span className="text-right shrink-0">
                          <b className="num block text-bad">
                            {usd(l.amountCents)}
                          </b>
                          <span className="text-[11px] text-ink-2">
                            {AMOUNT_NOTE[l.kind]}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-ink-2 shrink-0 mt-1"
                        />
                      </button>
                      </li>
                    ))}
                  </ul>
                  {report.losers.length > 10 && (
                    <button
                      type="button"
                      className="btn btn-text btn-sm mt-1"
                      onClick={() => setShowAllLosers((v) => !v)}
                    >
                      {showAllLosers
                        ? "Show fewer"
                        : `Show all ${report.losers.length}`}
                    </button>
                  )}
                </>
              )}

              {report.shrinkByReason.length > 0 && (
                <div className="mt-4 bg-white border border-line rounded-2xl p-3.5">
                  <h3 className="m-0 mb-2 text-[15px] font-bold">
                    Lost in counts, by reason
                  </h3>
                  <ul className="m-0 p-0 list-none text-sm space-y-1">
                    {report.shrinkByReason.map((s) => (
                      <li key={s.reason} className="flex justify-between gap-3">
                        <span>
                          {s.reason} · {s.units} unit{s.units === 1 ? "" : "s"}
                        </span>
                        <b className="num text-bad">
                          {usd(s.costCents)}
                        </b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {report.serviceCosts.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[18px] font-bold m-0 mb-1">
                What your services use most
              </h2>
              <p className="text-sm text-ink-2 m-0 mb-2">
                Backbar products aren’t sold, so they’re a cost of doing
                services. Big numbers here are worth checking against what you
                charge.
              </p>
              <ul className="m-0 p-0 list-none bg-white border border-line rounded-2xl divide-y divide-line">
                {report.serviceCosts.map((s) => (
                  <li key={s.productId}>
                  <button
                    type="button"
                    data-profit-row="service"
                    className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 bg-transparent border-0 cursor-pointer hover:bg-surface"
                    onClick={() =>
                      setPicked({
                        ...s,
                        key: "service",
                        summary: `${s.units} used · ${usd(s.costCents)} in product cost`,
                      })
                    }
                  >
                    <Thumb imageUrl={s.imageUrl} label={s.brand || s.name} />
                    <span className="flex-1 min-w-0">
                      <b className="block truncate text-[15px]">{name(s)}</b>
                      <span className="text-[13px] text-ink-2">
                        {s.units} used
                      </span>
                    </span>
                    <b className="num shrink-0">
                      {usd(s.costCents)}
                    </b>
                    <ChevronRight size={16} className="text-ink-2 shrink-0" />
                  </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.removed.length > 0 && (
            <section className="mt-6" data-profit-removed>
              <h2 className="text-[18px] font-bold m-0 mb-1">
                Removed from this report ({report.removed.length})
              </h2>
              <p className="text-sm text-ink-2 m-0 mb-2">
                You marked these as incorrect, so they’re left off the lists
                and out of the totals. Put one back any time.
              </p>
              <ul className="m-0 p-0 list-none bg-white border border-line rounded-2xl divide-y divide-line">
                {report.removed.map((r) => (
                  <li
                    key={`${r.key}-${r.productId}`}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <span className="flex-1 min-w-0">
                      <b className="block truncate text-[15px]">{name(r)}</b>
                      <span className="text-[13px] text-ink-2">
                        {LIST_LABEL(r.key)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-tonal btn-sm shrink-0"
                      onClick={() => putBack(r)}
                    >
                      <Undo2 size={15} /> Put back
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6 bg-surface rounded-2xl p-4 text-sm">
            <h2 className="flex items-center gap-2 text-[16px] font-bold m-0 mb-2">
              <Info size={17} /> How to make these numbers right
            </h2>
            <ol className="m-0 pl-5 space-y-1.5">
              <li>
                <b>Every sale has to reach Bintro.</b> Connect Square (sales
                come in on their own), upload your booking app’s product sales
                report, or scan out each sale.
              </li>
              <li>
                <b>Every product needs a cost and a retail price.</b> Receipts
                and delivery check-ins update costs for you; set retail
                yourself.
              </li>
              <li>
                <b>Scan out what you use on clients</b> so backbar doesn’t look
                like missing stock.
              </li>
              <li>
                <b>Count often.</b> Lost stock only shows up after a count.{" "}
                {report.gaps.neverCounted} of {report.gaps.productsTotal}{" "}
                products have never been counted. Use Count &amp; reconcile
                monthly and pick a reason for each difference.
              </li>
              <li>
                <b>Give products a category.</b> That’s how Bintro tells retail
                you sell from backbar you use.
              </li>
            </ol>
            <p className="text-[12px] text-ink-2 mt-3 mb-0">
              Profit uses each product’s current cost and retail price, so
              discounts given at checkout aren’t counted.
            </p>
          </section>
        </>
      )}

      <Sheet
        open={picked !== null}
        onClose={() => setPicked(null)}
        title={picked ? name(picked) : ""}
        subtitle={picked ? LIST_LABEL(picked.key) : undefined}
      >
        {picked && (
          <div data-profit-sheet>
            <p className="bg-surface rounded-xl px-3.5 py-3 text-sm m-0 mb-4">
              {picked.summary}
            </p>
            <b className="block text-[15px] mb-2">Is this wrong?</b>
            <div className="grid gap-2.5">
              <button
                type="button"
                className="text-left flex items-start gap-3 bg-white border border-line rounded-2xl px-4 py-3.5 cursor-pointer hover:border-royal disabled:opacity-50"
                disabled={!products.some((p) => p.id === picked.productId)}
                onClick={() => {
                  const product = products.find(
                    (p) => p.id === picked.productId,
                  );
                  if (!product) return;
                  setPicked(null);
                  setEditing(product);
                }}
              >
                <Pencil size={19} className="text-action shrink-0 mt-0.5" />
                <span>
                  <b className="block text-[15px]">Correct it</b>
                  <span className="text-[13px] text-ink-2">
                    Fix the cost, retail price, count on hand, Fill to,
                    expiry date or category. The report updates with the
                    right numbers.
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="text-left flex items-start gap-3 bg-white border border-line rounded-2xl px-4 py-3.5 cursor-pointer hover:border-royal disabled:opacity-50"
                disabled={busy}
                onClick={() => removeRow(picked)}
              >
                <EyeOff size={19} className="text-action shrink-0 mt-0.5" />
                <span>
                  <b className="block text-[15px]">
                    {busy ? "Removing…" : "Remove from this report"}
                  </b>
                  <span className="text-[13px] text-ink-2">
                    Takes it off this list and out of the totals. The product
                    and its stock aren’t touched, and you can put it back at
                    the bottom of this page.
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Correct product"
        subtitle="Editing the on-hand count is logged as an adjustment."
      >
        {editing && (
          <ProductForm
            key={editing.id}
            product={editing}
            products={products}
            saveLabel="Save"
            onCancel={() => setEditing(null)}
            onSave={async ({ barcode, ...values }) => {
              let saved = (await updateProduct({
                data: { productId: editing.id, ...values, staffName },
              })) as Product;
              if (barcode !== editing.barcode) {
                saved = (await setProductBarcode({
                  data: { productId: editing.id, barcode },
                })) as Product;
              }
              if (saved) onProduct?.(saved);
              setEditing(null);
              await onChanged();
              setReload((n) => n + 1);
              toast(`Saved ${values.name}`);
            }}
            onDelete={async () => {
              await deleteProduct({ data: { productId: editing.id } });
              setEditing(null);
              await onChanged();
              setReload((n) => n + 1);
              toast(`Deleted ${editing.name}`);
            }}
            onMerge={async (target) => {
              const r = (await mergeProducts({
                data: { sourceId: editing.id, targetId: target.id },
              })) as { product: Product };
              if (r?.product) onProduct?.(r.product);
              setEditing(null);
              await onChanged();
              setReload((n) => n + 1);
              toast(`Merged ${editing.name} into ${target.name}`);
            }}
          />
        )}
      </Sheet>
    </>
  );
}
