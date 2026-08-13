/**
 * lib/api.ts — canonical, typed fetcher for the TruthLoop API.
 *
 * Every feature module imports `api` (or `ApiError`) from here — never
 * `fetch` directly — so auth cookies, base URL, JSON encoding, error shape,
 * and content-type stay consistent across the app.
 *
 * Two consumers:
 *   1. `api<T>(path, opts)` → parses JSON, throws `ApiError` on non-2xx.
 *      Use this for normal happy-path fetches where the caller wants the
 *      parsed body or a thrown error.
 *   2. `fetchRaw(path, opts)` → returns the raw `Response`. Use this when
 *      the caller needs to inspect status (e.g. swallowing 401 in
 *      `getMeQuery`) or upload a stream.
 */

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Build `${API_BASE}${path}?${qs}` from a relative path and query map. */
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Build the standard RequestInit with credentials + JSON content-type. */
function buildInit(method: string, body: unknown, headers: RequestOptions['headers'], signal?: AbortSignal): RequestInit {
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(headers ?? {}),
    },
    signal,
  };
  if (body !== undefined) {
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return init;
}

/**
 * Raw `fetch` against the API. Returns the `Response` so the caller decides
 * how to interpret status codes — useful when you want to swallow 401, read
 * a header, or stream the body.
 *
 * Defaults: `credentials: 'include'` (cookie auth), `Accept: application/json`,
 * `Content-Type: application/json` when a body is set.
 */
export async function fetchRaw(path: string, opts: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, query, signal, headers } = opts;
  return fetch(buildUrl(path, query), buildInit(method, body, headers, signal));
}

/**
 * Typed JSON fetcher. Parses the response body and returns it as `T`.
 *
 * Behaviour:
 *   - 204 / empty body → returns `undefined as T` (caller expects undefined).
 *   - non-2xx → throws `ApiError` with the server's `message` field if present,
 *     else `Request failed (${status})`.
 *   - parse error on non-empty body → keeps raw text as `ApiError.body`.
 */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, headers } = opts;
  const res = await fetch(buildUrl(path, query), buildInit(method, body, headers, signal));

  if (res.status === 204) return undefined as T;

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'message' in parsed && typeof (parsed as { message: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}