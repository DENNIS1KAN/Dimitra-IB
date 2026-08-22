// The password length rule, dependency-free so client components (the
// account form) can import it; lib/password.ts (node:crypto) re-exports it.

/** Enforced server-side in every action that sets a password. */
export const MIN_PASSWORD_LENGTH = 8;

export const isAcceptablePassword = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;
