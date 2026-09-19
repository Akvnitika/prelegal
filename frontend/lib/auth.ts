import { apiPost, authorizedPost } from "@/lib/api";
import {
  clearSession,
  type AuthUser,
  type Session,
} from "@/lib/session";

export type { AuthUser, Session };
export { clearSession, readSession, storeSession } from "@/lib/session";

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export const signUp = (credentials: AuthCredentials) =>
  apiPost<AuthResponse>("/api/auth/signup", credentials);

export const signIn = (credentials: { email: string; password: string }) =>
  apiPost<AuthResponse>("/api/auth/login", credentials);

/** Invalidates the server session (best effort) and clears the local one. */
export async function signOut(): Promise<void> {
  try {
    await authorizedPost<void>("/api/auth/signout", {});
  } catch {
    // The local session is cleared regardless; a dead token is harmless.
  }
  clearSession();
}
