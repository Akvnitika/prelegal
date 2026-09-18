import { apiPost } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export const signUp = (credentials: AuthCredentials) =>
  apiPost<AuthResponse>("/api/auth/signup", credentials);

export const signIn = (credentials: AuthCredentials) =>
  apiPost<AuthResponse>("/api/auth/login", credentials);

// Placeholder "session": PL-5 has no authentication, so the signed-in user
// is only remembered in localStorage and nothing enforces it. Real auth
// replaces this with a server-side session.
const SESSION_KEY = "prelegal.currentUser";

export const storeSession = (user: AuthUser) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));

export const readSession = (): AuthUser | null => {
  const raw = window.localStorage.getItem(SESSION_KEY);
  try {
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => window.localStorage.removeItem(SESSION_KEY);
