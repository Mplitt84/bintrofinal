import { useEffect, useState } from "react";
import { AlertTriangle, Info, TrendingDown, TrendingUp } from "lucide-react";
import { getProfitReport } from "@/server/profit.functions";
import {
  centsToDollars,
  dollarsShort,
  EmptyState,
  PageHead,
  StatGrid,
  StatTile,
  Thumb,
} from "@/components/ui/bits";
import type { LoserKind, ProfitPeriod, ProfitReport } from "@/lib/profit";

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
  onOpenProducts,
}: {
  onOpenProducts?: () => void;
}) {
  const [days, setDays] = useState<ProfitPeriod>(90);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [error, setError] = useState("");
  const [showAllLosers, setShowAllLosers] = useState(false);

  useEffect(() => {
    let live = true;
    setReport(null);
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
  }, [days]);

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
            onClick={() => setDays(p.days)}
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
                    <li
                      key={m.productId}
                      className="flex items-center gap-3 px-3.5 py-3"
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
                      <li
                        key={`${l.kind}-${l.productId}-${i}`}
                        className="flex items-start gap-3 px-3.5 py-3"
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
                  <li
                    key={s.productId}
                    className="flex items-center gap-3 px-3.5 py-2.5"
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
    </>
  );
}
