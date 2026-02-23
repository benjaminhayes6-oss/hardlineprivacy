
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.js';
function json(status, body){ return { statusCode: status, headers: { 'Content-Type':'application/json; charset=utf-8' }, body: JSON.stringify(body) }; }
export async function handler(event){ try{ const cookies = event.headers.cookie || ''; const token = (cookies.match(/hp_session=([^;]+)/)||[])[1] || ''; const payload = verifyJWT(token, process.env.JWT_SECRET); const email = (payload.email||'').toLowerCase(); const store = getStore('entitlements'); const rec = await store.get(email); const isAdmin = (process.env.HP_ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).includes(email); const entitled = isAdmin || !!rec && JSON.parse(rec).entitled; return json(200, { entitled, email, admin: isAdmin }); }catch(e){ return json(200, { entitled:false }); } }
