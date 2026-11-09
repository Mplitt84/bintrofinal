import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { SIGN_IN_ERRORS, type AuthState } from '@/lib/auth'

/** Full-page "Sign in with Google". Only emails on the business's access list get in. */
export function SignInScreen({ auth }: { auth: AuthState }) {
  const [error, setError] = useState('')
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('auth')
    if (reason) {
      setError(SIGN_IN_ERRORS[reason] ?? SIGN_IN_ERRORS.google)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  return (
    <main className="min-h-dvh grid place-items-center bg-page px-5">
      <div className="w-full max-w-[380px] bg-white border border-line rounded-3xl p-7 text-center shadow-sm">
        <div className="brand-tile mx-auto mb-4 w-14 h-14 rounded-2xl grid place-items-center text-white text-2xl font-black">B</div>
        <h1 className="m-0 text-[24px] font-black">Sign in to Bintro</h1>
        <p className="text-ink-2 text-sm mt-1.5 mb-6">Use the Google account your business added you with.</p>
        {error && <div className="bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 text-sm mb-4 text-left">{error}</div>}
        {!auth.ownerConfigured && (
          <div className="bg-warn-tint rounded-xl px-3.5 py-2.5 text-sm mb-4 text-left">
            No owner is set up yet. Add <code>BINTRO_OWNER_EMAIL</code> in Netlify, redeploy, then sign in with that Google account.
          </div>
        )}
        <a
          href="/api/auth/google/start"
          className="flex items-center justify-center gap-3 w-full rounded-full border border-line bg-white px-5 py-3 font-semibold text-ink no-underline hover:bg-surface"
        >
          <GoogleMark />
          Continue with Google
        </a>
        <p className="text-ink-2 text-[12px] mt-5 mb-0 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} /> Protected by your Google account’s 2-Step Verification
        </p>
        <p className="text-[12px] mt-4 mb-0">
          <a href="/terms" className="text-ink-2 no-underline mr-3">Terms</a>
          <a href="/privacy" className="text-ink-2 no-underline">Privacy</a>
        </p>
      </div>
    </main>
  )
}

/** Google's "G" mark (required by Google's sign-in branding guidelines). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
