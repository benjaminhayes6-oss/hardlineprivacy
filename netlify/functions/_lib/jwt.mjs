import crypto from 'node:crypto';

export function signJWT(payload, secret, { expSeconds = 7 * 24 * 3600, kid = 'k1' } = {}) {
  const header = { alg: 'HS256', typ: 'JWT', kid };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expSeconds;
  const body = { ...payload, iat, exp };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = b64(header);
  const p = b64(body);
  const toSign = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('base64url');
  return `${toSign}.${sig}`;
}

export function verifyJWT(token, secret) {
  if (!token || token.split('.').length !== 3) throw new Error('bad token');
  const [h, p, s] = token.split('.');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  if (sig !== s) throw new Error('bad signature');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
  return payload;
}
