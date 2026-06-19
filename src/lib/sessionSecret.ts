/**
 * In-memory only cache of the current session's login password, used to
 * derive the financial-vault key for seamless unlock. NEVER persisted to
 * storage and cleared on sign-out. A page refresh deliberately loses it, so the
 * vault re-locks until the user re-enters their password.
 */
let sessionPassword: string | null = null;

export function setSessionPassword(password: string): void {
  sessionPassword = password;
}

export function getSessionPassword(): string | null {
  return sessionPassword;
}

export function clearSessionPassword(): void {
  sessionPassword = null;
}
