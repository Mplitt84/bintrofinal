import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import { reportAppError } from "@/server/errors.functions";
import { BinBuddy } from "@/components/assistant/AskBintro";

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh grid place-items-center bg-page text-ink px-6">
      <div className="max-w-[420px] text-center">
        <span className="inline-grid place-items-center w-24 h-24 rounded-full bg-white shadow-[var(--shadow-card)] mb-5">
          <BinBuddy size={72} />
        </span>
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-royal">
          {title}
        </h1>
        <p className="text-ink-2 mt-2 mb-6">{body}</p>
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </main>
  );
}

/** Shown for any address that isn't a Bintro page. */
export function NotFoundPage() {
  return (
    <Shell
      title="That page isn’t here"
      body="The link may be old or mistyped. Your stock and records are safe."
    >
      <a href="/" className="btn btn-primary no-underline">
        Back to Bintro
      </a>
    </Shell>
  );
}

/** Shown if a page crashes, instead of a blank screen. */
export function ErrorPage({ error, reset }: { error: unknown; reset?: () => void }) {
  // A screen that failed to render is exactly what the owner needs to hear about.
  useEffect(() => {
    void reportError(error, "screen", (report) =>
      reportAppError({ data: { ...report, staffName: "" } }),
    );
  }, [error]);

  return (
    <Shell
      title="Something went wrong"
      body="Nothing was lost. Try again, and if it keeps happening email hello@bintroapp.com."
    >
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          reset?.();
          window.location.reload();
        }}
      >
        Try again
      </button>
      <a href="/" className="btn btn-tonal no-underline">
        Back to Bintro
      </a>
    </Shell>
  );
}
