import { clearSession, readSession } from "@/lib/session";

/**
 * Base URL for backend API calls. Empty string means same-origin, which is
 * correct when FastAPI serves the built frontend (Docker/production). For
 * `next dev` on :3000 against a local backend on :8003, set
 * NEXT_PUBLIC_API_BASE_URL=http://localhost:8003 (build-time only).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(response.status, detail || response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

// --- Session-authenticated calls -------------------------------------------

function handleExpiredSession(): void {
  clearSession();
  // A hard navigation on purpose: the session died mid-use (e.g. container
  // restart), so a full reset to sign-in beats router state surgery. Module
  // code has no access to the app router.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (typeof window !== "undefined") window.location.assign("/");
}

/** apiFetch plus the bearer token; a 401 (expired/foreign session, e.g.
 * after a container restart) clears the session and returns to sign-in. */
export async function authorizedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session = readSession();
  if (!session) {
    handleExpiredSession();
    throw new ApiError(401, "Not signed in.");
  }
  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${session.token}`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) handleExpiredSession();
    throw err;
  }
}

export const authorizedGet = <T>(path: string) => authorizedFetch<T>(path);

export const authorizedPost = <T>(path: string, body: unknown) =>
  authorizedFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

export const authorizedPut = <T>(path: string, body: unknown) =>
  authorizedFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const authorizedDelete = (path: string) =>
  authorizedFetch<void>(path, { method: "DELETE" });
