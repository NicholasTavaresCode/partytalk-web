import { env } from "./env";
import { getIdToken, expireSession } from "./googleAuth";

/** Typed error carrying the API's HTTP status (401 → sign in, 429 → rate limit, …). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Expired or rejected credential: back to the sign-in screen rather than failing silently.
  if (res.status === 401 && token) expireSession(token);

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const raw = json?.message ?? res.statusText;
    const message = Array.isArray(raw) ? raw.join(", ") : String(raw);
    throw new ApiError(res.status, message, json?.path);
  }

  // Successful responses are wrapped as { data, meta }.
  return (json && "data" in json ? json.data : json) as T;
}

/** GET a file (e.g. the host's audio): sent as it is, not in the envelope. Errors as for `request`. */
async function requestBlob(path: string): Promise<Blob> {
  const token = await getIdToken();
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401 && token) expireSession(token);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(res.status, String(json?.message ?? res.statusText), json?.path);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  blob: (path: string) => requestBlob(path),
};
