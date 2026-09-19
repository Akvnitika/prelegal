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

export const storeSession = (session: Session) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

export const readSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  try {
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed && parsed.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
};

export const clearSession = () =>
  window.localStorage.removeItem(SESSION_KEY);
