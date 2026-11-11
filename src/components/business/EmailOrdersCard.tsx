import { useEffect, useState } from "react";
import { Copy, Mail, RefreshCw } from "lucide-react";
import {
  getInboundSetup,
  resetInboundAddress,
} from "@/server/inbound.functions";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/components/ui/bits";

type Setup = Awaited<ReturnType<typeof getInboundSetup>>;

/**
 * Settings → Connections: the business's private address for vendor order emails
 * (Shop Pay / Shopify confirmations from Reverie, Hairstory, Cult+King…). Forwarded emails
 * become open orders under Restock → Deliveries.
 */
export function EmailOrdersCard({ isOwner }: { isOwner: boolean }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getInboundSetup()
      .then(setSetup)
      .catch(() => {});
  }, []);

  async function copy() {
    if (!setup?.address) return;
    try {
      await navigator.clipboard.writeText(setup.address);
      toast("Address copied");
    } catch {
      toast("Couldn’t copy — press and hold the address to copy it");
    }
  }

  async function reset() {
    if (!confirmReset) return setConfirmReset(true);
    setConfirmReset(false);
    try {
      setSetup(await resetInboundAddress());
      toast("New address made. The old one no longer works.");
    } catch {
      toast("Couldn’t make a new address. Try again.");
    }
  }

  return (
    <section className="bg-white border border-line rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-full bg-[#002CB7] text-white grid place-items-center shrink-0">
          <Mail size={19} />
        </span>
        <div>
          <h3 className="m-0 text-[16px] font-bold">Email orders to Bintro</h3>
          <p className="m-0 text-[13px] text-ink-2">
            Forward a vendor’s order confirmation here and it shows up under
            Restock → Deliveries.
          </p>
        </div>
      </div>

      {!setup ? (
        <div className="skel h-10 rounded-xl" />
      ) : setup.address ? (
        <>
          <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2.5">
            <code className="flex-1 min-w-0 break-all text-[13px] select-all">
              {setup.address}
            </code>
            <button
              type="button"
              className="btn btn-tonal btn-sm shrink-0"
              onClick={copy}
            >
              <Copy size={14} /> Copy
            </button>
          </div>
          <p className="text-[12px] text-ink-2 mt-2 mb-0">
            Save it as a contact (for example “Bintro orders”). When an order
            email comes in from Reverie, Hairstory, Cult+King or any vendor, tap{" "}
            <b>Forward</b> and send it here. Bintro reads the products,
            quantities and prices and saves it as an open order. Stock only
            changes when you check the delivery in. Keep this address private:
            anything sent to it becomes an order.
          </p>
          {isOwner && (
            <button
              type="button"
              className="btn btn-text btn-sm mt-1 !px-0"
              onClick={reset}
            >
              <RefreshCw size={13} />{" "}
              {confirmReset
                ? "Tap again to make a new address"
                : "Make a new address"}
            </button>
          )}
        </>
      ) : (
        <p className="bg-warn-tint rounded-xl px-3 py-2.5 text-[13px] m-0">
          Not set up on this site yet. It needs {setup.missing.join(", ")} in
          Netlify (from Resend → Receiving and Webhooks).
        </p>
      )}

      {setup?.address && setup.missing.length > 0 && (
        <p className="bg-warn-tint rounded-xl px-3 py-2.5 text-[13px] mt-2 mb-0">
          Emails can’t be read yet: add {setup.missing.join(", ")} in Netlify.
        </p>
      )}

      {setup && setup.recent.length > 0 && (
        <div className="mt-3">
          <h4 className="m-0 mb-1.5 text-[13px] font-semibold text-ink-2">
            Recently received
          </h4>
          <ul className="m-0 p-0 list-none divide-y divide-line">
            {setup.recent.map((r) => (
              <li
                key={r.id}
                className="py-2 text-[13px] flex items-start gap-2"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    r.status === "order"
                      ? "bg-good-tint text-good"
                      : r.status === "skipped"
                        ? "bg-warn-tint text-warn"
                        : "bg-bad-tint text-bad"
                  }`}
                >
                  {r.status === "order"
                    ? "Order"
                    : r.status === "skipped"
                      ? "Skipped"
                      : "Error"}
                </span>
                <span className="min-w-0">
                  <b className="block truncate">
                    {r.vendor || r.subject || r.from}
                  </b>
                  <span className="text-ink-2">
                    {r.message} · {timeAgo(r.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
