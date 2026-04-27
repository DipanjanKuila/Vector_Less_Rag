// API client for the Vectorless RAG FastAPI backend.
// Base URL is user-configurable and stored in localStorage so the same
// frontend works against local dev and deployed backends.

const STORAGE_KEY = "vrag_api_base_url";
const DEFAULT_BASE = "http://localhost:8000";

export function getApiBase(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
}

export function setApiBase(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}

export interface DocumentItem {
  id: string;
  name: string;
  // Tolerant of extra fields the backend might return
  [key: string]: unknown;
}

export interface AskResponse {
  answer: string;
  // Optional fields the backend may include
  sources?: unknown;
  [key: string]: unknown;
}

export interface TreeNode {
  id?: string | number;
  name?: string;
  title?: string;
  label?: string;
  summary?: string;
  content?: string;
  children?: TreeNode[];
  [key: string]: unknown;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body?.detail as string) || (body?.message as string) || JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {
        // ignore
      }
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadDocument(file: File): Promise<{ document_id?: string; id?: string; name?: string; [k: string]: unknown }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${getApiBase()}/upload-document`, {
    method: "POST",
    body: fd,
  });
  return handle(res);
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${getApiBase()}/documents`);
  const data = await handle<unknown>(res);

  // Be tolerant of various response shapes
  const arr = Array.isArray(data)
    ? data
    : Array.isArray((data as { documents?: unknown[] })?.documents)
      ? (data as { documents: unknown[] }).documents
      : [];

  return arr.map((d, i) => {
    const obj = (typeof d === "object" && d !== null ? d : {}) as Record<string, unknown>;
    const id = String(obj.id ?? obj.document_id ?? obj.doc_id ?? i);
    const name = String(obj.name ?? obj.doc_name ?? obj.filename ?? obj.title ?? `Document ${id}`);
    return { ...obj, id, name } as DocumentItem;
  });
}

export async function askQuestion(documentId: string, question: string): Promise<AskResponse> {
  const params = new URLSearchParams({ document_id: documentId, query: question });
  const res = await fetch(`${getApiBase()}/ask?${params}`, { method: "POST" });
  const data = await handle<Record<string, unknown>>(res);
  const answer =
    (data.answer as string) ||
    (data.response as string) ||
    (data.result as string) ||
    (typeof data === "string" ? (data as unknown as string) : JSON.stringify(data));
  return { ...data, answer };
}

export async function getDocumentTree(documentId: string): Promise<TreeNode> {
  const res = await fetch(`${getApiBase()}/document-tree/${encodeURIComponent(documentId)}`);
  const data = await handle<{ tree: TreeNode[]; document_name: string }>(res);
  return { name: data.document_name, children: data.tree };
}
