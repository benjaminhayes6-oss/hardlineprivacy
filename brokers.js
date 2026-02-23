
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.js';
const DATA = [{"domain":"spokeo.com","risk":"high","removalUrl":"https://www.spokeo.com/optout","notes":"Email verification"}];
function json(status, body){ return { statusCode: status, headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"public, max-age=86400" }, body: JSON.stringify(body) }; }
export async function handler(event){ try{ const cookies = event.headers.cookie || ''; const token = (cookies.match(/hp_session=([^;]+)/)||[])[1] || ''; const payload = verifyJWT(token, process.env.JWT_SECRET); const email = (payload.email||'').toLowerCase(); const isAdmin = (process.env.HP_ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).includes(email); let entitled = false; if (isAdmin) entitled = true; else { const store = getStore('entitlements'); const rec = await store.get(email); entitled = !!rec && JSON.parse(rec).entitled; } if (!entitled) return json(403, { error:'Forbidden' }); return json(200, DATA); }catch(e){ return json(403, { error:'Forbidden' }); } }
