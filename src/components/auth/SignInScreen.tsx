import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SIGN_IN_ERRORS, type AuthState } from "@/lib/auth";

/** Full-page "Sign in with Google". Only emails on the business's access list get in. */
export function SignInScreen({ auth }: { auth: AuthState }) {
  const [error, setError] = useState("");
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("auth");
    if (reason) {
      setError(SIGN_IN_ERRORS[reason] ?? SIGN_IN_ERRORS.google);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <main className="h-dvh overflow-hidden bg-[#fdde55] flex flex-col lg:grid lg:grid-cols-2">
      {/* Brand photo, always shown whole. Phones/tablets: it takes the space above the sign-in strip.
          Wide screens: left half, with the sign-in card on the right. */}
      <picture className="flex-1 min-h-0 flex justify-center pt-[env(safe-area-inset-top)] lg:h-dvh">
        <source
          type="image/webp"
          srcSet="/signin-720.webp 720w, /signin-1152.webp 1152w"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <img
          src="/signin-720.jpg"
          alt="Fire your inventory app now — Bintro"
          width={1152}
          height={2048}
          fetchPriority="high"
          className="h-full w-full object-contain object-bottom lg:object-center lg:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        />
      </picture>
      <div className="shrink-0 flex justify-center px-4 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] lg:items-center lg:p-8">
        <div className="w-full max-w-[380px] text-center lg:bg-white/95 lg:border lg:border-white lg:rounded-3xl lg:p-7 lg:shadow-lg">
          <h1 className="hidden lg:block m-0 text-[24px] font-black text-[#002CB7]">
            Sign in to Bintro
          </h1>
          <p className="hidden lg:block text-ink-2 text-sm mt-1 mb-6">
            {auth.signupOpen
              ? "Sign in, or start your own business with the same button."
              : "Use the Google account your business added you with."}
          </p>
          {error && (
            <div className="bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 text-sm mb-3 text-left">
              {error}
            </div>
          )}
          {!auth.ownerConfigured && (
            <div className="bg-warn-tint rounded-xl px-3.5 py-2.5 text-sm mb-3 text-left">
              No owner is set up yet. Add <code>BINTRO_OWNER_EMAIL</code> in
              Netlify, redeploy, then sign in with that Google account.
            </div>
          )}
          <a
            href="/api/auth/google/start"
            className="flex items-center justify-center gap-3 w-full rounded-full border border-[#002CB7]/15 bg-white px-5 py-3 font-semibold text-ink no-underline shadow-md hover:bg-surface lg:shadow-none lg:border-line"
          >
            <GoogleMark />
            Continue with Google
          </a>
          {auth.signupOpen && (
            <p className="text-[#002CB7]/90 lg:text-ink-2 text-[13px] mt-3 mb-0">
              New to Bintro? The same button starts your own business — sign in
              with Google and we’ll set it up.
            </p>
          )}
          <p className="text-[#002CB7]/80 lg:text-ink-2 text-[12px] mt-2.5 lg:mt-4 mb-0 flex items-center justify-center gap-1.5 flex-wrap">
            <ShieldCheck size={14} /> Google 2-Step Verification
            <span aria-hidden="true">·</span>
            <a href="/terms" className="text-inherit no-underline">
              Terms
            </a>
            <span aria-hidden="true">·</span>
            <a href="/privacy" className="text-inherit no-underline">
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/welcome" className="text-inherit no-underline">
              What is Bintro?
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

/** Google's "G" mark (required by Google's sign-in branding guidelines). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
