import {
  ArrowRight,
  Boxes,
  CalendarDays,
  Camera,
  ClipboardList,
  CloudOff,
  Receipt,
  ScanLine,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { BinBuddy } from "@/components/assistant/AskBintro";
import { PLANS, TRIAL_DAYS, priceFor } from "@/lib/plans";
import { INDUSTRIES } from "@/lib/industry";
import { businessTypeById } from "@/lib/business-types";
import { LEGAL } from "@/lib/legal";

/** Brand colors, fixed here the way the mascot and app icons are. */
const MUSTARD = "#F2C033";
const ROYAL = "#002CB7";

/** What Bintro actually does today. Nothing here is a promise about later. */
const DOES = [
  {
    Icon: ScanLine,
    title: "Scan it in, scan it out",
    body: "Phone camera, a hardware wand or a Bluetooth scanner. The count changes as it happens, and every scan is logged under whoever made it.",
  },
  {
    Icon: Truck,
    title: "Order before you run out",
    body: "Bintro watches what's low, builds the order per supplier, emails it, then checks the delivery in against what you ordered — and scores each supplier on what actually turned up.",
  },
  {
    Icon: TrendingUp,
    title: "See what makes and costs money",
    body: "Which products earn, which sell at a loss, what's sitting on the shelf, what expired, what went missing in counts. From your own records, not estimates.",
  },
  {
    Icon: ClipboardList,
    title: "Client records built for your trade",
    body: "Color formulas for salons, an ink log for tattoo, treatments and skin notes for a med spa — with the take-home products each client bought.",
  },
  {
    Icon: Receipt,
    title: "Money, in one place",
    body: "Monthly spend against your budget, receipts photographed and read for you, every category filed under the tax line your accountant books it to.",
  },
  {
    Icon: CloudOff,
    title: "Works in the back room",
    body: "No signal where the stock lives? Scans are kept on the phone and send themselves the moment you're back.",
  },
];

const ALSO = [
  { Icon: Camera, text: "Snap a label and Bintro reads it" },
  { Icon: Boxes, text: "Count & reconcile, with reasons and undo" },
  { Icon: Users, text: "Your whole team, with their own names on every scan" },
  { Icon: CalendarDays, text: "Reorders, deliveries and your state's tax dates" },
  { Icon: Sparkles, text: "Ask Bintro about your own numbers" },
];

export function LandingPage() {
  const trades = INDUSTRIES.filter((i) => i.records).map((i) => businessTypeById(i.id));

  return (
    <main className="min-h-dvh bg-page text-ink">
      {/* Hero */}
      <section style={{ background: MUSTARD }} className="px-5 py-12 lg:py-20">
        <div className="mx-auto max-w-[1000px] grid gap-8 lg:grid-cols-[1.1fr_auto] lg:items-center">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold text-white mb-4"
              style={{ background: ROYAL }}
            >
              For salons, barbershops, nail & lash studios, tattoo shops and spas
            </span>
            <h1
              className="text-[38px] leading-[1.05] lg:text-[60px] font-extrabold tracking-tight m-0 mb-4"
              style={{ color: ROYAL }}
            >
              Know what’s on your shelf, and what it’s costing you.
            </h1>
            <p className="text-[18px] lg:text-[21px] leading-snug m-0 mb-6 max-w-[34ch] text-[#1b1b1b]">
              Bintro is stock and money management for the people who actually
              run the floor. Scan a product in or out and everything else — what
              to reorder, what you spent, what earns — keeps itself up to date.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-bold text-white no-underline shadow-md"
                style={{ background: ROYAL }}
              >
                Open Bintro <ArrowRight size={18} />
              </a>
              <a
                href="#what"
                className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-3.5 font-bold no-underline"
                style={{ borderColor: ROYAL, color: ROYAL }}
              >
                See what it does
              </a>
            </div>
            <p className="text-[13.5px] mt-4 mb-0 text-[#1b1b1b]/80">
              {TRIAL_DAYS} days of everything, free. No card to start.
            </p>
          </div>
          <div className="hidden lg:block">
            <BinBuddy size={210} />
          </div>
        </div>
      </section>

      {/* The problem, in their words */}
      <section className="px-5 py-12 lg:py-16">
        <div className="mx-auto max-w-[900px]">
          <p className="text-[22px] lg:text-[28px] leading-snug font-bold m-0 text-center">
            Most shops find out they’re out of something{" "}
            <span style={{ color: ROYAL }}>with a client in the chair.</span>
          </p>
          <p className="text-ink-2 text-[17px] leading-relaxed mt-4 mb-0 text-center max-w-[60ch] mx-auto">
            The stock sits in a back room, the spend sits in a shoebox, and
            nobody knows which products actually make money. Bintro puts all
            three in one place, on the phone that’s already in your pocket.
          </p>
        </div>
      </section>

      {/* What it does */}
      <section id="what" className="px-5 pb-6">
        <div className="mx-auto max-w-[1000px] grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DOES.map(({ Icon, title, body }) => (
            <div key={title} className="bg-white border border-line rounded-2xl p-5">
              <span
                className="w-11 h-11 rounded-full grid place-items-center text-white mb-3"
                style={{ background: ROYAL }}
              >
                <Icon size={21} />
              </span>
              <h2 className="text-[18px] font-bold m-0 mb-1.5">{title}</h2>
              <p className="text-ink-2 text-[14.5px] leading-relaxed m-0">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto max-w-[1000px] bg-surface rounded-2xl p-6">
          <h2 className="text-[20px] font-bold m-0 mb-4">And the rest of it</h2>
          <ul className="list-none m-0 p-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALSO.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[15px]">
                <Icon size={18} className="shrink-0 mt-0.5" style={{ color: ROYAL }} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Set up for the trade */}
      <section className="px-5 py-10 lg:py-14">
        <div className="mx-auto max-w-[1000px] text-center">
          <h2 className="text-[26px] lg:text-[32px] font-extrabold tracking-tight m-0 mb-2">
            It sets itself up for your trade
          </h2>
          <p className="text-ink-2 text-[17px] m-0 mb-6 max-w-[58ch] mx-auto">
            Tell Bintro what you do and it arrives with the right categories,
            the right client record, the practices you tap on every visit and
            tips written for your chair.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {trades.map((t) => (
              <span
                key={t.id}
                className="rounded-full border-2 px-4 py-2 text-[15px] font-bold bg-white"
                style={{ borderColor: ROYAL, color: ROYAL }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing, straight from the plans the app charges */}
      <section className="px-5 py-10 lg:py-14 bg-surface">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="text-[26px] lg:text-[32px] font-extrabold tracking-tight m-0 mb-1 text-center">
            Simple pricing
          </h2>
          <p className="text-ink-2 text-[16px] m-0 mb-7 text-center">
            Start with {TRIAL_DAYS} days of everything. Keep the free plan for as
            long as you like.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 bg-white border-2 ${plan.id === "plus" ? "" : "border-line"}`}
                style={plan.id === "plus" ? { borderColor: ROYAL } : undefined}
              >
                {plan.id === "plus" && (
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white mb-2"
                    style={{ background: ROYAL }}
                  >
                    Most shops start here
                  </span>
                )}
                <h3 className="text-[20px] font-extrabold m-0">{plan.name}</h3>
                <p className="m-0 mb-3 mt-1">
                  <b className="text-[30px]" style={{ color: ROYAL }}>
                    ${Math.round(priceFor(plan, "month") / 100)}
                  </b>
                  <span className="text-ink-2 text-[15px]">
                    {plan.monthlyCents ? " / month" : ""}
                  </span>
                </p>
                <p className="text-ink-2 text-[14px] m-0 mb-3">{plan.tagline}</p>
                <ul className="list-none m-0 p-0 grid gap-1.5">
                  {plan.highlights.map((h) => (
                    <li key={h} className="text-[14px] flex items-start gap-2">
                      <span style={{ color: ROYAL }} aria-hidden="true">
                        ✓
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-ink-2 text-[13.5px] text-center mt-5 mb-0">
            Yearly works out cheaper on both paid plans. Prices are per location.
          </p>
        </div>
      </section>

      {/* Close */}
      <section className="px-5 py-14 text-center">
        <div className="mx-auto max-w-[700px]">
          <BinBuddy size={76} />
          <h2 className="text-[26px] lg:text-[34px] font-extrabold tracking-tight m-0 mt-3 mb-3">
            Built in a working salon
          </h2>
          <p className="text-ink-2 text-[17px] leading-relaxed m-0 mb-6">
            Bintro came out of {LEGAL.company.replace(/\s+LLC$/, "")}’s own back
            room — built because nothing on the market counted product the way a
            salon floor actually works. Every feature in it solved a real
            problem first.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 font-bold text-white no-underline shadow-md"
            style={{ background: ROYAL }}
          >
            Open Bintro <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="px-5 py-8 border-t border-line">
        <div className="mx-auto max-w-[1000px] flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-2">
          <b className="text-ink">Bintro</b>
          <a href={`mailto:${LEGAL.supportEmail}`} className="text-inherit no-underline">
            {LEGAL.supportEmail}
          </a>
          <a href="/terms" className="text-inherit no-underline">
            Terms
          </a>
          <a href="/privacy" className="text-inherit no-underline">
            Privacy
          </a>
          <span className="ml-auto">
            © {new Date().getFullYear()} {LEGAL.company}
          </span>
        </div>
      </footer>
    </main>
  );
}
