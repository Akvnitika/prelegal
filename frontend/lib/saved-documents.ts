import {
  authorizedDelete,
  authorizedGet,
  authorizedPost,
  authorizedPut,
} from "@/lib/api";
import { type ChatMessage } from "@/lib/chat";
import { type NdaData } from "@/lib/nda";

export interface SavedDocumentSummary {
  id: number;
  documentKey: string;
  title: string;
  updatedAt: string;
}

/** `data` for a generic creator document. */
export interface GenericDocData {
  fields: Record<string, string>;
  transcript: ChatMessage[];
}

/** `data` for a Mutual NDA document. */
export interface NdaDocData {
  nda: NdaData;
  transcript: ChatMessage[];
}

export interface SavedDocumentOut extends SavedDocumentSummary {
  data: GenericDocData | NdaDocData;
}

export const fetchSavedDocuments = () =>
  authorizedGet<{ documents: SavedDocumentSummary[] }>("/api/saved-documents");

export const fetchSavedDocument = (id: number) =>
  authorizedGet<SavedDocumentOut>(`/api/saved-documents/${id}`);

export const createSavedDocument = (body: {
  documentKey: string;
  title: string;
  data: GenericDocData | NdaDocData;
}) => authorizedPost<SavedDocumentOut>("/api/saved-documents", body);

export const updateSavedDocument = (
  id: number,
  body: { title?: string; data?: GenericDocData | NdaDocData },
) => authorizedPut<SavedDocumentOut>(`/api/saved-documents/${id}`, body);

export const deleteSavedDocument = (id: number) =>
  authorizedDelete(`/api/saved-documents/${id}`);

// --- Open-from-list handoff -------------------------------------------------
// Static export has no dynamic routes; "open" stashes the id for the creator
// page to consume on mount.

const HANDOFF_KEY = "prelegal.openSavedDocument";

export const setOpenHandoff = (id: number) =>
  window.sessionStorage.setItem(HANDOFF_KEY, String(id));

/** Pure read (safe during render and re-entrant effects): the waiting
 * handoff id, if any. Consuming is a separate step (clearOpenHandoff) so
 * React StrictMode's double-invoked effects can't lose the id. */
export const peekOpenHandoff = (): number | null => {
  if (typeof window === "undefined") return null;
  const id = Number(window.sessionStorage.getItem(HANDOFF_KEY));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const hasOpenHandoff = (): boolean => peekOpenHandoff() !== null;

export const clearOpenHandoff = () =>
  window.sessionStorage.removeItem(HANDOFF_KEY);

// --- Titles -----------------------------------------------------------------

/** "just now" → "5 minutes ago" → "3 hours ago" → "Sep 12, 2026". */
export function formatUpdatedAt(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PARTY_FIELD_NAMES = ["Provider", "Company", "Customer", "Partner"];

/** "Cloud Service Agreement — Acme & Globex" when parties are known. */
export function deriveGenericTitle(
  documentName: string,
  fields: Record<string, string>,
): string {
  const parties = PARTY_FIELD_NAMES.map((name) => fields[name]?.trim())
    .filter((v): v is string => Boolean(v))
    .slice(0, 2);
  return parties.length > 0
    ? `${documentName} — ${parties.join(" & ")}`
    : documentName;
}

export function deriveNdaTitle(data: NdaData): string {
  const parties = [data.party1.company.trim(), data.party2.company.trim()]
    .filter(Boolean)
    .slice(0, 2);
  return parties.length > 0
    ? `Mutual NDA — ${parties.join(" & ")}`
    : "Mutual NDA";
}
