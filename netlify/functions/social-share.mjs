export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' }
    });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const title = String(payload.title || '').trim();
  const url = String(payload.url || '').trim();
  const requestedPlatforms = Array.isArray(payload.platforms) ? payload.platforms : [];
  const normalizedPlatforms = requestedPlatforms
    .map((platform) => String(platform || '').toLowerCase())
    .filter((platform) => platform === 'twitter' || platform === 'linkedin');

  if (!title || !url) {
    return new Response(JSON.stringify({ error: 'Both title and url are required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  let enabledConnectors = [];
  try {
    const raw = Netlify.env.get('SOCIAL_CONNECTORS_ENABLED') || '';
    enabledConnectors = raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    enabledConnectors = [];
  }

  const targets = normalizedPlatforms.length ? normalizedPlatforms : ['twitter', 'linkedin'];
  const activeTargets = targets.filter((platform) => enabledConnectors.includes(platform));

  if (!activeTargets.length) {
    return new Response(JSON.stringify({
      queued: false,
      message: 'No social connectors are enabled. Set SOCIAL_CONNECTORS_ENABLED to enable publishing.',
      requested: targets
    }), {
      status: 202,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    queued: true,
    message: 'Post payload accepted for enabled social connectors.',
    post: { title, url },
    platforms: activeTargets
  }), {
    status: 202,
    headers: { 'content-type': 'application/json' }
  });
};

export const config = {
  path: '/api/social/share',
  method: 'POST'
};
