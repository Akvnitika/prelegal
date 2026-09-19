/** Browser-side session storage: the bearer token plus the signed-in user.
 * Import-free so both the API layer and the auth flows can use it. */

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

export interface Session {
  token: string;
  user: AuthUser;
}

const SESSION_KEY = "prelegal.session";

function parseSession(raw: string | null): Session | null {
  try {
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed && parsed.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export const storeSession = (session: Session) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

export const readSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  return parseSession(window.localStorage.getItem(SESSION_KEY));
};

export const clearSession = () => {
  window.localStorage.removeItem(SESSION_KEY);
  // PL-5's bare-user key; purge so nothing stale lingers.
  window.localStorage.removeItem("prelegal.currentUser");
};

// --- useSyncExternalStore plumbing ------------------------------------------
// The snapshot is cached by raw string so repeated reads return the same
// object reference (useSyncExternalStore compares snapshots with Object.is).

let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

export const readSessionSnapshot = (): Session | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parseSession(raw);
  }
  return cachedSession;
};

export const subscribeNever = () => () => {};
