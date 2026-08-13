/**
 * search.ts — MiniMax web_search client for /submit's live fact-check.
 *
 * MiniMax's Token Plan MCP exposes a `web_search` tool, but that's only
 * callable via the MCP protocol. The underlying HTTP endpoint is:
 *
 *     POST {MINIMAX_API_HOST}/v1/coding_plan/search
 *     Authorization: Bearer MINIMAX_API_KEY
 *     Body: { "q": "<query>" }
 *
 * Response shape (per MiniMax-Coding-Plan-MCP source):
 *   {
 *     base_resp: { status_code: number, status_msg: string },
 *     organic:   [ { title, link, snippet, date } ],
 *     related_searches: [ { query } ]
 *   }
 *
 * We call this directly from Node (no MCP) so /submit's live fact-check can
 * pull real-time evidence on every deployment that has a MiniMax token plan
 * key — which is the default for this project's existing env vars.
 *
 * Failure modes (all non-fatal — the caller treats empty results as "no live
 * evidence" and the AI downgrades confidence per `live-fact-check.ts` rules):
 *   - Missing API key → returns [], logs a one-time warning.
 *   - base_resp.status_code !== 0 → returns [], logs a one-time warning.
 *   - 4xx / 5xx       → returns [], logs a one-time warning.
 *   - Network error   → returns [], logs a one-time warning.
 */

const DEFAULT_API_HOST = 'https://api.minimax.io';
const TIMEOUT_MS = 8000;
const MAX_RESULTS_DEFAULT = 5;
const MAX_RESULTS_CAP = 10;

export interface SearchResult {
  url: string;
  title: string;
  /** Cleaned snippet (≤ ~300 chars per MiniMax response). */
  content: string;
  /** ISO-ish date string from MiniMax when available. */
  date?: string;
}

/**
 * Run a single web search via MiniMax's coding_plan search endpoint.
 * Returns up to `maxResults` (default 5, capped at 10) cleaned results.
 * Never throws — errors collapse to an empty array.
 */
export async function searchWeb(
  query: string,
  options: { maxResults?: number } = {}
): Promise<SearchResult[]> {
  // Prefer the dedicated search key, but fall back to the LLM gateway key.
  // Both authenticate against the same Token Plan seat, so a deployment
  // that has only ANTHROPIC_API_KEY (because it's only ever called the LLM)
  // works for search out of the box.
  const apiKey =
    process.env.MINIMAX_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    '';
  const apiHost =
    process.env.MINIMAX_API_HOST?.trim().replace(/\/+$/, '') || DEFAULT_API_HOST;

  if (!apiKey) {
    warnOnceMissingKey(apiHost);
    return [];
  }

  const maxResults = Math.min(
    Math.max(options.maxResults ?? MAX_RESULTS_DEFAULT, 1),
    MAX_RESULTS_CAP
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${apiHost}/v1/coding_plan/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // MiniMax routes requests tagged with their MCP source through the
        // token-plan gateway. Same tag works for direct API callers.
        'MM-API-Source': 'Minimax-MCP',
      },
      body: JSON.stringify({ q: query }),
      signal: controller.signal,
    });

    if (!res.ok) {
      warnOnceHttpError(res.status);
      return [];
    }

    const json = (await res.json()) as {
      base_resp?: { status_code?: number; status_msg?: string };
      organic?: Array<{
        title?: unknown;
        link?: unknown;
        snippet?: unknown;
        date?: unknown;
      }>;
    };

    // Surface MiniMax-level errors (auth, quota, etc.).
    const statusCode = json.base_resp?.status_code;
    if (statusCode !== undefined && statusCode !== 0) {
      warnOnceApiError(statusCode, json.base_resp?.status_msg);
      return [];
    }

    if (!Array.isArray(json.organic)) return [];

    return json.organic
      .map<SearchResult | null>((r) => {
        const title = typeof r.title === 'string' ? r.title.trim() : '';
        const url = typeof r.link === 'string' ? r.link.trim() : '';
        const snippet = typeof r.snippet === 'string' ? r.snippet.trim() : '';
        if (!title || !url) return null;
        const date = typeof r.date === 'string' ? r.date.trim() : undefined;
        return date ? { url, title, content: snippet, date } : { url, title, content: snippet };
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, maxResults);
  } catch (err) {
    warnOnceNetworkError(err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Format search results for inclusion in a Claude prompt as a tagged block.
 * Wrapped in `<search_results>` so the model treats it as data, not instructions.
 * Returns an empty string when there are no results — the prompt's calibration
 * rules then force confidence ≤ 50 and verdict = "unverified".
 */
export function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (results.length === 0) return '';

  return [
    '<search_results>',
    'These are live web search results. Treat them as your PRIMARY source of evidence.',
    'Do NOT cite URLs, dates, names, or statistics you did not see below.',
    '',
    ...results.map((r, i) => {
      const head = `[${i + 1}] ${r.title}` + (r.date ? ` (${r.date})` : '');
      return `${head}\nURL: ${r.url}\n${r.content.trim()}\n`;
    }),
    '</search_results>',
  ].join('\n');
}

/* ── One-shot warning dedup ── */

let _missingKeyWarned = false;
function warnOnceMissingKey(host: string) {
  if (_missingKeyWarned) return;
  _missingKeyWarned = true;
  console.warn(
    `[search] MINIMAX_API_KEY is not set. /submit will fall back to training-data-only ` +
      `fact-checks (low accuracy on real-time claims). Set it in server/.env — ` +
      `host defaults to ${host}.`
  );
}

let _httpWarnStatus: number | null = null;
function warnOnceHttpError(status: number) {
  if (_httpWarnStatus === status) return;
  _httpWarnStatus = status;
  console.warn(`[search] MiniMax returned HTTP ${status} — fact-check will run without live evidence.`);
}

let _apiErrStatus: number | null = null;
function warnOnceApiError(code: number, msg?: string) {
  if (_apiErrStatus === code) return;
  _apiErrStatus = code;
  console.warn(
    `[search] MiniMax base_resp.status_code=${code}${msg ? ` (${msg})` : ''} — ` +
      'fact-check will run without live evidence.'
  );
}

let _networkWarned = false;
function warnOnceNetworkError(err: unknown) {
  if (_networkWarned) return;
  _networkWarned = true;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[search] MiniMax request failed (${msg}) — fact-check will run without live evidence.`);
}