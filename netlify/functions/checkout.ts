import type { Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

type PlanKey = "one-time" | "monitoring" | "pro";

type Counts = {
  total: number;
  plans: Record<PlanKey, number>;
  updatedAt: string;
};

const STRIPE_URLS: Record<PlanKey, string> = {
  "one-time": "https://buy.stripe.com/fZudR138saXV3F06rJcjS02",
  monitoring: "https://buy.stripe.com/9B614fcJ28PNejE03lcjS00",
  pro: "https://buy.stripe.com/14AdR19wQc1Z0sOg2jcjS05",
};

function normalizePlan(plan: string | null): PlanKey | null {
  if (!plan) return null;
  const value = plan.trim().toLowerCase();
  if (["one-time", "one_time", "one", "cleanup"].includes(value)) return "one-time";
  if (["monitoring", "ongoing", "subscription", "sub"].includes(value)) return "monitoring";
  if (["pro", "enhanced", "high-risk"].includes(value)) return "pro";
  return null;
}

function getTrackingStore() {
  if (process.env.CONTEXT === "production") {
    return getStore("checkout-tracking");
  }
  return getDeployStore("checkout-tracking");
}

async function incrementCount(plan: PlanKey) {
  const store = getTrackingStore();
  const key = "counts";
  const current = await store.get(key, { type: "json" }) as Counts | null;
  const next: Counts = {
    total: (current?.total ?? 0) + 1,
    plans: {
      "one-time": (current?.plans?.["one-time"] ?? 0) + (plan === "one-time" ? 1 : 0),
      monitoring: (current?.plans?.monitoring ?? 0) + (plan === "monitoring" ? 1 : 0),
      pro: (current?.plans?.pro ?? 0) + (plan === "pro" ? 1 : 0),
    },
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(key, next);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." }, { allow: "POST" });
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  const blockedBots = [
    "AhrefsBot",
    "SemrushBot",
    "MJ12bot",
    "DotBot",
    "PetalBot",
    "Baiduspider",
    "YandexBot",
    "Screaming Frog",
    "facebookexternalhit",
    "Slackbot",
    "Bytespider",
    "ClaudeBot",
    "Google-InspectionTool",
  ];

  const normalizedUserAgent = userAgent.toLowerCase();
  if (blockedBots.some((bot) => normalizedUserAgent.includes(bot.toLowerCase()))) {
    return json(403, { error: "Bots not allowed" });
  }

  const providedToken = req.headers.get("x-checkout-token");
  const expectedToken = process.env.CHECKOUT_SECRET;
  if (!expectedToken) {
    return json(500, { error: "Server misconfigured: CHECKOUT_SECRET missing" });
  }
  if (!providedToken || providedToken !== expectedToken) {
    return json(403, { error: "Unauthorized" });
  }

  let payload: { plan?: string } | null = null;
  try {
    payload = (await req.json()) as { plan?: string };
  } catch (error) {
    return json(400, { error: "Invalid JSON body" });
  }
  const plan = normalizePlan(payload?.plan ?? null);

  if (!plan) {
    return json(400, { error: "Invalid or missing plan" });
  }

  try {
    await incrementCount(plan);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        msg: "checkout_tracking_failed",
        plan,
        requestId: context?.requestId,
      }),
    );
  }

  return Response.redirect(STRIPE_URLS[plan], 302);
};

function json(statusCode: number, data: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}
