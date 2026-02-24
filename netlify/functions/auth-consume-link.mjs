import { getStore } from '@netlify/blobs';
import { signJWT } from './_lib/jwt.mjs';

function text(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  });
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return text(400, 'Missing token');

    const store = getStore('login_tokens');
    const rec = await store.get(token, { type: 'json' });
    if (!rec) return text(400, 'Invalid or expired token');
    if (Date.now() > rec.exp) return text(400, 'Token expired');

    await store.delete(token);

    const jwtSecret = Netlify.env.get('JWT_SECRET');
    if (!jwtSecret) return text(500, 'Server misconfigured');

    const jwt = signJWT({ email: rec.email, scope: 'member' }, jwtSecret, { expSeconds: 7 * 24 * 3600 });
    const cookie = `hp_session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
    const dest = '/members/opt-out-hub/';

    return new Response('Redirecting…', {
      status: 302,
      headers: { 'Set-Cookie': cookie, Location: dest },
    });
  } catch (error) {
    console.error(error);
    return text(500, 'Server error');
  }
};
