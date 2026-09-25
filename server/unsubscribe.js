import { createHmac, timingSafeEqual } from 'node:crypto';
import { serviceRole } from './entities.js';

function base64url(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(input) {
  const secret = process.env.UNSUBSCRIBE_SIGNING_SECRET || 'dev-secret-change-me';
  return base64url(createHmac('sha256', secret).update(input).digest('base64'));
}

// Constant-time comparison — never use `a === b` for signature verification.
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function buildUnsubscribeUrl({ prospect_id, to_email, owner_email }) {
  const e = base64url(to_email || '');
  const p = String(prospect_id || '');
  const o = base64url(owner_email || '');
  const s = sign(`${e}.${p}.${o}`);
  const origin = process.env.API_URL || 'http://localhost:3001';
  const params = new URLSearchParams({ e, p, o, s });
  return `${origin}/api/unsubscribe?${params.toString()}`;
}

export async function processUnsubscribe({ e, p, o, s }) {
  if (!e || !p || !s) {
    const err = new Error('Missing unsubscribe parameters');
    err.status = 400;
    throw err;
  }
  const expected = sign(`${e}.${p}.${o || ''}`);
  if (!safeEqual(expected, s)) {
    const err = new Error('Invalid unsubscribe signature');
    err.status = 403;
    throw err;
  }

  const email = base64urlDecode(e).toLowerCase();
  const ownerEmail = o ? base64urlDecode(o) : null;

  const existing = serviceRole.Suppression.filter({ email }).find((row) => !ownerEmail || row.owner_email === ownerEmail);
  if (!existing) {
    serviceRole.Suppression.create({ email, owner_email: ownerEmail, reason: 'unsubscribe', source_prospect_id: p });
  }

  const prospect = serviceRole.Prospect.get(p);
  if (prospect) serviceRole.Prospect.update(p, { status: 'lost' });

  const pending = serviceRole.OutreachEmail.filter({ prospect_id: p, sent: false });
  for (const outreach of pending) {
    if (String(outreach.to_email || '').toLowerCase() === email) {
      serviceRole.OutreachEmail.update(outreach.id, { enabled: false });
    }
  }

  return { email, prospect_id: p };
}

export function renderUnsubscribePage(success, message) {
  const dotColor = success ? '#84cc16' : '#ef4444';
  const title = success ? "You're unsubscribed" : 'Something went wrong';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#0f1014;color:#e4e4e7;display:grid;place-items:center;height:100vh;margin:0}
    main{max-width:420px;padding:32px;border:1px solid #24262c;background:#16181d;border-radius:12px;text-align:center}
    .dot{width:10px;height:10px;border-radius:9999px;background:${dotColor};display:inline-block;margin-bottom:16px}
    h1{font-weight:600;font-size:20px;margin:0 0 12px}
    p{font-family:ui-monospace,monospace;font-size:13px;color:#a1a1aa;line-height:1.6}
  </style></head>
  <body><main><span class="dot"></span><h1>${title}</h1><p>${message}</p></main></body></html>`;
}
