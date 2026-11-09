/** Client-safe sign-in types. */
export type AuthUser = { id: number; email: string; name: string; role: 'owner' | 'staff' }

export type AuthState = {
  /** False until the Google keys are set; the app is then open as before. */
  enabled: boolean
  user: AuthUser | null
  /** BINTRO_OWNER_EMAIL is set, so the owner can make the first sign-in. */
  ownerConfigured: boolean
}

export type AccessUser = AuthUser & { lastSignInAt: string | null }

/** Messages for ?auth=<reason> after a failed sign-in. */
export const SIGN_IN_ERRORS: Record<string, string> = {
  'not-allowed': 'That Google account isn’t on this business’s access list. Ask the owner to add your email.',
  unverified: 'Google hasn’t verified that email address yet.',
  state: 'That sign-in link expired. Try again.',
  google: 'Google didn’t finish the sign-in. Try again.',
  cancelled: 'Sign-in was cancelled.',
  'signed-out': 'Sign in to continue.',
  'owner-only': 'Only an owner can do that. Ask the owner to make the change.',
}
