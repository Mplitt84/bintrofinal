import { useEffect, useRef, useState, useId } from "react";
import { ArrowUp } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useBusiness } from "@/components/business/BusinessContext";
import { askBintroFn } from "@/server/assistant.functions";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What is running low?",
  "What sold the most this month?",
  "What should I order this week?",
  "How much is my stock worth?",
  "What have we not used in a while?",
  "Who scanned the most this week?",
];

/**
 * Bintro's mascot: a friendly bin tipping its lid. Fixed brand colors (mustard body, royal blue
 * lines) with soft gradients, so it looks the same in every palette.
 */
export function BinBuddy({
  size = 56,
  blink = true,
}: {
  size?: number;
  blink?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="block shrink-0"
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFDA5C" />
          <stop offset="0.55" stopColor="#F2C033" />
          <stop offset="1" stopColor="#E0A617" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="1" stopColor="#F2C033" />
        </linearGradient>
        <radialGradient id={`${id}e`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#1C4BE0" />
          <stop offset="1" stopColor="#001E8A" />
        </radialGradient>
      </defs>
      <ellipse
        cx="32"
        cy="59.5"
        rx="15"
        ry="2.6"
        fill="#001E8A"
        opacity=".14"
      />
      <path
        d="M14.5 21.5 H49.5 L46.4 53.2 Q45.9 58 41.1 58 H22.9 Q18.1 58 17.6 53.2 Z"
        fill={`url(#${id}b)`}
        stroke="#002CB7"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M19.2 25 L21.4 52.5"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M27 49.5 v4 M32 49.5 v4 M37 49.5 v4"
        stroke="#C48A08"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="rotate(-7 32 16)">
        <path
          d="M26.5 10.5 V8.6 Q26.5 6 29.1 6 H34.9 Q37.5 6 37.5 8.6 V10.5"
          fill="none"
          stroke="#002CB7"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect
          x="10"
          y="10.5"
          width="44"
          height="8"
          rx="4"
          fill={`url(#${id}l)`}
          stroke="#002CB7"
          strokeWidth="2.4"
        />
        <path
          d="M14.5 13.2 H30"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity=".6"
        />
      </g>
      <g className={blink ? "bin-buddy-eyes" : undefined}>
        <ellipse
          cx="25"
          cy="32.5"
          rx="5.4"
          ry="6.2"
          fill="#fff"
          stroke="#002CB7"
          strokeWidth="1.8"
        />
        <ellipse
          cx="39"
          cy="32.5"
          rx="5.4"
          ry="6.2"
          fill="#fff"
          stroke="#002CB7"
          strokeWidth="1.8"
        />
        <circle cx="26" cy="33.6" r="3.1" fill={`url(#${id}e)`} />
        <circle cx="40" cy="33.6" r="3.1" fill={`url(#${id}e)`} />
        <circle cx="27.2" cy="32.2" r="1.15" fill="#fff" />
        <circle cx="41.2" cy="32.2" r="1.15" fill="#fff" />
      </g>
      <ellipse
        cx="20.6"
        cy="41.6"
        rx="2.6"
        ry="1.6"
        fill="#F0764A"
        opacity=".5"
      />
      <ellipse
        cx="43.4"
        cy="41.6"
        rx="2.6"
        ry="1.6"
        fill="#F0764A"
        opacity=".5"
      />
      <path
        d="M26.5 41.4 Q32 47 37.5 41.4"
        fill="#fff"
        stroke="#002CB7"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Ask Bintro": the floating bin buddy opens a chat that answers questions
 * about this business's own data (AI, Plus).
 */
export function AskBintro() {
  const { can } = useBusiness();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const allowed = can("ai");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError("");
    setText("");
    const history = turns;
    setTurns([...history, { role: "user", content: q }]);
    setBusy(true);
    try {
      const r = await askBintroFn({
        data: {
          question: q,
          history: history.slice(-8),
          timeZone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "America/Chicago",
          localNow: new Date().toLocaleString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      });
      if (r.ok) setTurns((t) => [...t, { role: "assistant", content: r.text }]);
      else setError(r.message);
    } catch {
      setError(
        "Bintro couldn’t answer just now. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Bintro a question about your data"
        title="Ask Bintro"
        className="bin-buddy-button fixed z-[41] left-4 min-[1060px]:left-[264px] bottom-[calc(env(safe-area-inset-bottom)+84px)] min-[1060px]:bottom-6 w-[64px] h-[64px] rounded-full bg-white border border-line shadow-lg grid place-items-center cursor-pointer print:hidden"
      >
        <BinBuddy size={50} />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Ask Bintro"
        subtitle="Ask anything about your stock, sales, orders and counts. Bintro only answers from your own Bintro data."
      >
        {!allowed ? (
          <div className="flex items-center gap-3 bg-surface rounded-2xl p-4">
            <BinBuddy size={48} blink={false} />
            <p className="m-0 text-sm">
              Ask Bintro comes with Bintro Plus. You can upgrade in Settings →
              Account &amp; billing.
            </p>
          </div>
        ) : (
          <>
            <div
              className="min-h-[200px] max-h-[52vh] overflow-auto pr-1"
              aria-live="polite"
            >
              {turns.length === 0 && (
                <div className="flex items-start gap-3 mb-4">
                  <BinBuddy size={44} />
                  <div className="bg-surface rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[15px]">
                    Hi! I’m Bintro. Ask me about your stuff, like what’s running
                    low or what sold the most. Try one of these:
                  </div>
                </div>
              )}
              {turns.length === 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 pl-[56px]">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip !text-[13px]"
                      onClick={() => ask(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {turns.map((t, i) =>
                t.role === "user" ? (
                  <div key={i} className="flex justify-end mb-3">
                    <div className="bg-action text-white rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] text-[15px] whitespace-pre-wrap">
                      {t.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2.5 mb-3">
                    <span className="shrink-0 mt-0.5">
                      <BinBuddy size={32} blink={false} />
                    </span>
                    <div className="bg-surface rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[88%] text-[15px] whitespace-pre-wrap leading-relaxed">
                      {t.content}
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex items-center gap-2.5 mb-3">
                  <BinBuddy size={32} />
                  <span className="text-sm text-ink-2">
                    Looking through your data…
                  </span>
                </div>
              )}
              {error && (
                <p className="text-sm text-bad font-semibold">{error}</p>
              )}
              <div ref={endRef} />
            </div>

            <form
              className="flex items-end gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
            >
              <textarea
                className="field-input flex-1 !py-2.5 resize-none"
                rows={1}
                maxLength={600}
                placeholder="Ask about your stock…"
                aria-label="Your question"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(text);
                  }
                }}
              />
              <button
                type="submit"
                className="btn btn-primary !px-3.5 !py-2.5"
                disabled={busy || !text.trim()}
                aria-label="Send"
              >
                <ArrowUp size={18} />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2">
              <p className="m-0 text-[12px] text-ink-2">
                Bintro can’t change anything. Double-check big decisions.
              </p>
              {turns.length > 0 && (
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  onClick={() => {
                    setTurns([]);
                    setError("");
                  }}
                >
                  Start over
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
