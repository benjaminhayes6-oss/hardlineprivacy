import type { Config, Context } from "@netlify/functions";

type SearchResult = {
  title: string;
  link: string;
  source: string;
};

type ProviderStatus = {
  ok: boolean;
  count: number;
  durationMs: number;
  error?: string;
};

export default async (req: Request, context: Context) => {
  const requestId = generateRequestId();
  const startedAt = Date.now();

  const { name, city } = await readRequestParams(req);
  const providers: Record<string, ProviderStatus> = {
    google: initProviderStatus(),
    duckduckgo: initProviderStatus(),
  };

  const GOOGLE_API_KEY = getEnv("GOOGLE_API_KEY");
  const GOOGLE_CX = getEnv("GOOGLE_CX");
  const hasGoogleKey = Boolean(GOOGLE_API_KEY);
  const hasGoogleCx = Boolean(GOOGLE_CX);
  const hasGoogle = hasGoogleKey && hasGoogleCx;

  if (!name || !city) {
    providers.google = {
      ok: false,
      count: 0,
      durationMs: 0,
      error: "invalid-input",
    };
    providers.duckduckgo = {
      ok: false,
      count: 0,
      durationMs: 0,
      error: "invalid-input",
    };
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "scan_invalid_input",
        requestId,
        env: {
          GOOGLE_API_KEY: hasGoogleKey,
          GOOGLE_CX: hasGoogleCx,
        },
        hasName: Boolean(name),
        hasCity: Boolean(city),
        providers,
      }),
    );
    return Response.json(
      {
        success: false,
        requestId,
        exposure: "low",
        results: [],
        providers,
        message: "Missing name or city.",
      },
      { status: 400 },
    );
  }

  try {
    const query = `${name} ${city}`.trim();
    const results: SearchResult[] = [];
    const errors: string[] = [];

    console.log(
      JSON.stringify({
        level: "info",
        msg: "scan_request",
        requestId,
        queryLength: query.length,
        env: {
          GOOGLE_API_KEY: hasGoogleKey,
          GOOGLE_CX: hasGoogleCx,
        },
        providers,
      }),
    );

    if (hasGoogle) {
      const start = Date.now();
      try {
        const items = await googleCustomSearch(query, GOOGLE_API_KEY!, GOOGLE_CX!);
        results.push(...items);
        providers.google = {
          ok: true,
          count: items.length,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        const message = normalizeError(err, "Google search failed");
        providers.google = {
          ok: false,
          count: 0,
          durationMs: Date.now() - start,
          error: message,
        };
        errors.push(message);
      }
    } else {
      providers.google = {
        ok: false,
        count: 0,
        durationMs: 0,
        error: "Google API keys not configured",
      };
    }

    if (results.length === 0) {
      const start = Date.now();
      try {
        const items = await duckDuckGoSearch(query);
        results.push(...items);
        providers.duckduckgo = {
          ok: true,
          count: items.length,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        const message = normalizeError(err, "DuckDuckGo search failed");
        providers.duckduckgo = {
          ok: false,
          count: 0,
          durationMs: Date.now() - start,
          error: message,
        };
        errors.push(message);
      }
    } else {
      providers.duckduckgo = {
        ok: false,
        count: 0,
        durationMs: 0,
        error: "skipped",
      };
    }

    const deduped = dedupeResults(results);
    const exposure = estimateExposure(deduped.length);

    const limitedVisibility =
      errors.length > 0 ||
      !hasGoogle ||
      (providers.duckduckgo.error ? providers.duckduckgo.error !== "skipped" : false);

    const message = limitedVisibility ? "Scan complete. Limited visibility." : "Scan complete.";

    console.log(
      JSON.stringify({
        level: "info",
        msg: "scan_response",
        requestId,
        resultCount: deduped.length,
        exposure,
        durationMs: Date.now() - startedAt,
        providers,
      }),
    );

    return Response.json({
      success: true,
      requestId,
      exposure,
      results: deduped,
      providers,
      message,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "scan_unexpected_error",
        requestId,
        providers,
        error: normalizeError(err, "Unexpected error"),
      }),
    );
    return Response.json({
      success: true,
      requestId,
      exposure: "moderate",
      results: [],
      providers,
      message: "Scan complete. Limited visibility.",
    });
  }
};

const GOOGLE_TIMEOUT_MS = 6000;
const DUCKDUCKGO_TIMEOUT_MS = 5500;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function getEnv(key: string): string | undefined {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } })
    .Netlify?.env;
  return netlifyEnv?.get?.(key);
}

function initProviderStatus(): ProviderStatus {
  return { ok: false, count: 0, durationMs: 0, error: "skipped" };
}

async function readRequestParams(req: Request): Promise<{ name: string; city: string }> {
  const url = new URL(req.url);
  let name = (url.searchParams.get("name") || "").trim();
  let city = (url.searchParams.get("city") || "").trim();

  if (req.method && req.method.toUpperCase() !== "GET") {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    try {
      if (contentType.includes("application/json")) {
        const body = await req.json();
        if (typeof body?.name === "string" && body.name.trim()) name = body.name.trim();
        if (typeof body?.city === "string" && body.city.trim()) city = body.city.trim();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        if (params.get("name")) name = params.get("name")!.trim();
        if (params.get("city")) city = params.get("city")!.trim();
      }
    } catch {
      // If body parsing fails, fall back to query params.
    }
  }

  return { name, city };
}

function normalizeError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}

function estimateExposure(count: number): "low" | "moderate" | "elevated" {
  if (count >= 8) return "elevated";
  if (count >= 3) return "moderate";
  return "low";
}

function dedupeResults(items: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.link?.trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function googleCustomSearch(q: string, apiKey: string, cx: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ key: apiKey, cx, q, num: "10" });
  const res = await fetchWithTimeout(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    {},
    GOOGLE_TIMEOUT_MS,
  );
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.error?.status || "";
    } catch {
      // ignore
    }
    throw new Error(`Google API ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((item: { title?: string; link?: string }) => ({
      title: item.title || "",
      link: item.link || "",
      source: "google",
    }))
    .filter((item: SearchResult) => Boolean(item.title && item.link));
}

async function duckDuckGoSearch(q: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q });
  const res = await fetchWithTimeout(
    `https://html.duckduckgo.com/html/?${params.toString()}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://duckduckgo.com/",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    },
    DUCKDUCKGO_TIMEOUT_MS,
  );

  if (!res.ok) throw new Error(`DuckDuckGo returned status ${res.status}`);
  const html = await res.text();
  return parseDdgHtml(html);
}

function parseDdgHtml(html: string): SearchResult[] {
  const items: SearchResult[] = [];
  const blocks = html.split('class="result ');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.substring(0, 200).includes("result--ad")) continue;

    const aMatch = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!aMatch) continue;

    const rawHref = aMatch[1];
    const title = stripTags(decodeHtmlEntities(aMatch[2]));

    let link = "";
    const uddgMatch = /uddg=([^&]+)/.exec(rawHref);
    if (uddgMatch) {
      link = decodeURIComponent(uddgMatch[1]);
    } else if (rawHref.startsWith("http")) {
      link = rawHref;
    } else if (rawHref.startsWith("//")) {
      link = `https:${rawHref}`;
    }

    if (!title || !link) continue;
    if (link.includes("duckduckgo.com/y.js") || link.includes("duckduckgo.com/l/")) continue;

    items.push({ title, link, source: "duckduckgo" });
  }

  return items.slice(0, 20);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function generateRequestId(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const config: Config = {
  path: "/api/search",
};
