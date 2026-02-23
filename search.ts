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
  console.log(
    JSON.stringify({
      level: "info",
      msg: "scan_env_check",
      requestId,
      env: {
        googleApiKeyPresent: hasGoogleKey,
        googleCxPresent: hasGoogleCx,
      },
    }),
  );

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
        exposure: "moderate",
        results: [],
        limitedVisibility: true,
        providers,
        message: "Missing name or city.",
      },
      { status: 400 },
    );
  }

  try {
    const query = `"${name}" ${city}`.trim();
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
    const relevant = filterRelevantResults(deduped, name);
    
    const limitedVisibility =
      !hasGoogle ||
      Object.values(providers).some(
        (provider) => !provider.ok && Boolean(provider.error && provider.error !== "skipped"),
      );

    // Count distinct high-risk broker domains in the relevant results
    const brokerHits = new Set<string>();
    for (const item of relevant) {
      try {
        const hostname = new URL(item.link).hostname.replace(/^www\./, "").toLowerCase();
        if (KNOWN_BROKER_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))) {
          brokerHits.add(hostname);
        }
      } catch {
        // ignore invalid URLs
      }
    }

    // Determine exposure level based on strict rules
    let exposure: "low" | "moderate" | "elevated" = "moderate"; // Default baseline
    if (relevant.length >= 4 || brokerHits.size >= 2) {
      exposure = "elevated";
    } else if (relevant.length >= 1) {
      exposure = "moderate";
    } else {
      const highConfidence =
        !limitedVisibility && providers.google.ok &&
        (providers.duckduckgo.ok || providers.duckduckgo.error === "skipped");
      exposure = highConfidence ? "low" : "moderate";
    }

    const message = limitedVisibility
      ? "Scan complete. Limited visibility because some sources were unavailable."
      : "Scan complete.";

    console.log(
      JSON.stringify({
        level: "info",
        msg: "scan_response",
        requestId,
        totalResults: deduped.length,
        relevantResults: relevant.length,
        exposure,
        limitedVisibility,
        durationMs: Date.now() - startedAt,
        providers,
        errors,
      }),
    );

    return Response.json({
      success: true,
      requestId,
      exposure,
      results: relevant,
      limitedVisibility,
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
      success: false,
      requestId,
      exposure: "moderate",
      results: [],
      limitedVisibility: true,
      providers,
      message: "Scan complete with limited visibility.",
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

const KNOWN_BROKER_DOMAINS = [
  "spokeo.com",
  "whitepages.com",
  "radaris.com",
  "truepeoplesearch.com",
  "fastpeoplesearch.com",
  "beenverified.com",
  "truthfinder.com",
  "instantcheckmate.com",
  "intelius.com",
  "nuwber.com",
  "peoplefinders.com",
  "ussearch.com",
  "peekyou.com",
  "mylife.com",
  "zabasearch.com",
  "thatsThem.com",
  "clustrmaps.com",
  "cyberbackgroundchecks.com",
  "publicrecords.com",
  "addresses.com",
  "anywho.com",
  "411.com",
  "peoplesearchnow.com",
  "advancedbackgroundchecks.com",
  "familytreenow.com",
  "searchpeoplefree.com",
];

function isRelevantResult(item: SearchResult, name: string): boolean {
  const titleLower = (item.title || "").toLowerCase();
  const linkLower = (item.link || "").toLowerCase();
  const nameParts = name.toLowerCase().split(/\s+/).filter((p) => p.length > 1);

  // Always keep results from known data broker domains
  try {
    const hostname = new URL(item.link).hostname.replace(/^www\./, "").toLowerCase();
    if (KNOWN_BROKER_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))) {
      return true;
    }
  } catch {
    // invalid URL, skip domain check
  }

  // Keep results that contain the person's name (first + last at minimum)
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    if (titleLower.includes(firstName) && titleLower.includes(lastName)) {
      return true;
    }
    if (linkLower.includes(firstName) && linkLower.includes(lastName)) {
      return true;
    }
  }

  // Keep results from people-search or public records categories
  const peopleSearchKeywords = [
    "people search",
    "public record",
    "background check",
    "phone number",
    "address history",
    "find people",
    "people finder",
    "lookup",
    "person search",
  ];
  if (peopleSearchKeywords.some((kw) => titleLower.includes(kw))) {
    return true;
  }

  return false;
}

function filterRelevantResults(items: SearchResult[], name: string): SearchResult[] {
  return items.filter((item) => isRelevantResult(item, name));
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
    let errorReason = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.error?.status || "";
      errorReason = body?.error?.errors?.[0]?.reason || "";
    } catch {
      // ignore
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: "google_api_error",
        status: res.status,
        detail,
        errorReason,
        cxLength: cx.length,
        apiKeyLength: apiKey.length,
      }),
    );
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
