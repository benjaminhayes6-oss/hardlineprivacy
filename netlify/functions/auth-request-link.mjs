import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function sendEmail(to, subject, html) {
  const provider = (Netlify.env.get('EMAIL_PROVIDER') || '').toLowerCase();
  const apiKey = Netlify.env.get('EMAIL_API_KEY') || '';
  const from = Netlify.env.get('EMAIL_FROM') || 'no-reply@hardlineprivacy.com';

  if (provider === 'mailgun') {
    const domain = Netlify.env.get('EMAIL_DOMAIN') || 'hardlineprivacy.com';
    const form = new URLSearchParams({ from, to, subject, html });
    const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}` },
      body: form,
    });
    if (!resp.ok) throw new Error(`Mailgun error: ${resp.status}`);
    return;
  }

  if (provider === 'sendgrid') {
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!resp.ok) throw new Error(`SendGrid error: ${resp.status}`);
    return;
  }

  if (provider === 'postmark') {
    const resp = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ From: from, To: to, Subject: subject, HtmlBody: html }),
    });
    if (!resp.ok) throw new Error(`Postmark error: ${resp.status}`);
    return;
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let email = '';
  try {
    const payload = await req.json();
    email = (payload?.email || '').trim();
  } catch {
    email = '';
  }

  if (!email) return json(400, { error: 'Missing email' });

  const provider = Netlify.env.get('EMAIL_PROVIDER');
  const apiKey = Netlify.env.get('EMAIL_API_KEY');
  if (!provider || !apiKey) {
    return json(500, { error: 'Email delivery is not configured.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const store = getStore('login_tokens');
  const rec = { email: email.toLowerCase(), exp: Date.now() + 15 * 60 * 1000 };
  await store.setJSON(token, rec);

  const base = (Netlify.env.get('URL') || 'https://hardlineprivacy.com').replace(/\/$/, '');
  const loginUrl = `${base}/api/auth-consume-link?token=${token}`;

  try {
    await sendEmail(
      email,
      'Your Hardline Privacy sign-in link',
      `<p>Click below to sign in. This link expires in 15 minutes.</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    );
  } catch (error) {
    return json(500, { error: 'Failed to send sign-in email. Please try again later.' });
  }

  return json(200, { ok: true });
};
