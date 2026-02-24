import { getDeployStore, getStore } from '@netlify/blobs';

const STRIPE_URLS = {
  'one-time': 'https://buy.stripe.com/fZudR138saXV3F06rJcjS02',
  monitoring: 'https://buy.stripe.com/9B614fcJ28PNejE03lcjS00',
  pro: 'https://buy.stripe.com/14AdR19wQc1Z0sOg2jcjS05',
};

function normalizePlan(plan) {
  if (!plan) return null;
  const value = plan.trim().toLowerCase();
  if (['one-time', 'one_time', 'one', 'cleanup'].includes(value)) return 'one-time';
  if (['monitoring', 'ongoing', 'subscription', 'sub'].includes(value)) return 'monitoring';
  if (['pro', 'enhanced', 'high-risk'].includes(value)) return 'pro';
  return null;
}

function getTrackingStore() {
  if (Netlify.context?.deploy?.context === 'production') {
    return getStore('checkout-tracking');
  }
  return getDeployStore();
}

async function incrementCount(plan) {
  const store = getTrackingStore();
  const key = 'counts';
  const current = await store.get(key, { type: 'json' });
  const next = {
    total: (current?.total ?? 0) + 1,
    plans: {
      'one-time': (current?.plans?.['one-time'] ?? 0) + (plan === 'one-time' ? 1 : 0),
      monitoring: (current?.plans?.monitoring ?? 0) + (plan === 'monitoring' ? 1 : 0),
      pro: (current?.plans?.pro ?? 0) + (plan === 'pro' ? 1 : 0),
    },
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(key, next);
}

function json(statusCode, data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed. Use POST.' }, { allow: 'POST' });
  }

  const userAgent = req.headers.get('user-agent') ?? '';
  const blockedBots = [
    'AhrefsBot',
    'SemrushBot',
    'MJ12bot',
    'DotBot',
    'PetalBot',
    'Baiduspider',
    'YandexBot',
    'Screaming Frog',
    'facebookexternalhit',
    'Slackbot',
    'Bytespider',
    'ClaudeBot',
    'Google-InspectionTool',
  ];

  const normalizedUserAgent = userAgent.toLowerCase();
  if (blockedBots.some((bot) => normalizedUserAgent.includes(bot.toLowerCase()))) {
    return json(403, { error: 'Bots not allowed' });
  }

  const providedToken = req.headers.get('x-checkout-token');
  const expectedToken = Netlify.env.get('CHECKOUT_SECRET');
  if (!expectedToken) {
    return json(500, { error: 'Server misconfigured: CHECKOUT_SECRET missing' });
  }
  if (!providedToken || providedToken !== expectedToken) {
    return json(403, { error: 'Unauthorized' });
  }

  let payload = null;
  try {
    payload = await req.json();
  } catch (error) {
    return json(400, { error: 'Invalid JSON body' });
  }
  const plan = normalizePlan(payload?.plan ?? null);

  if (!plan) {
    return json(400, { error: 'Invalid or missing plan' });
  }

  try {
    await incrementCount(plan);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'checkout_tracking_failed',
        plan,
        requestId: context?.requestId,
      }),
    );
  }

  return Response.redirect(STRIPE_URLS[plan], 302);
};
