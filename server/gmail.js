import { randomBytes } from 'node:crypto';
import { db } from './db.js';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
];

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export function isGmailConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${process.env.API_URL || 'http://localhost:3001'}/api/gmail/callback`;
}

function cleanupExpiredStates() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(cutoff);
}

export function buildAuthUrl(userId) {
  cleanupExpiredStates();
  const state = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)').run(state, userId, Date.now());

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES.join(' '),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleCallback({ code, state }) {
  const row = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
  if (!row) { const e = new Error('Invalid or expired OAuth state'); e.status = 400; throw e; }
  db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);

  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) { const e = new Error('Failed to exchange Gmail authorization code'); e.status = 400; throw e; }
  const tokens = await res.json();
  if (!tokens.refresh_token) {
    const e = new Error('Google did not return a refresh token. Revoke prior access at myaccount.google.com/permissions and try again.');
    e.status = 400;
    throw e;
  }

  const profile = await getProfile(tokens.access_token);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

  db.prepare(`
    INSERT INTO gmail_connections (user_id, email, access_token, refresh_token, expires_at, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email = excluded.email,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      updated_date = excluded.updated_date
  `).run(row.user_id, profile.emailAddress || null, tokens.access_token, tokens.refresh_token, expiresAt, now, now);

  return { userId: row.user_id, email: profile.emailAddress };
}

export async function disconnect(userId) {
  const conn = db.prepare('SELECT * FROM gmail_connections WHERE user_id = ?').get(userId);
  if (conn) {
    try {
      await fetch(`${REVOKE_URL}?token=${encodeURIComponent(conn.refresh_token)}`, { method: 'POST' });
    } catch { /* best effort */ }
  }
  db.prepare('DELETE FROM gmail_connections WHERE user_id = ?').run(userId);
  return { success: true };
}

async function refreshAccessToken(conn) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: conn.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) {
    db.prepare('DELETE FROM gmail_connections WHERE user_id = ?').run(conn.user_id);
    return null;
  }
  const tokens = await res.json();
  const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
  db.prepare('UPDATE gmail_connections SET access_token = ?, expires_at = ?, updated_date = ? WHERE user_id = ?')
    .run(tokens.access_token, expiresAt, new Date().toISOString(), conn.user_id);
  return { ...conn, access_token: tokens.access_token, expires_at: expiresAt };
}

export async function getCurrentAppUserConnection(userId) {
  const conn = db.prepare('SELECT * FROM gmail_connections WHERE user_id = ?').get(userId);
  if (!conn) return null;
  if (conn.expires_at - 60_000 > Date.now()) return conn;
  return refreshAccessToken(conn);
}

export async function gmailFetch(accessToken, urlPath, init = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `https://gmail.googleapis.com${urlPath}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Gmail API error: ${res.status} ${text}`);
    err.status = res.status === 401 ? 401 : 502;
    throw err;
  }
  return res.json();
}

export function getProfile(accessToken) {
  return gmailFetch(accessToken, '/gmail/v1/users/me/profile');
}

export function base64url(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeMimeHeader(value) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function cleanHeaderValue(value) {
  return String(value ?? '').replace(/[\r\n]/g, ' ');
}

export function buildRawEmail({ from, to, subject, body, replyTo, fromName, inReplyTo, references }) {
  const fromHeader = fromName ? `${encodeMimeHeader(cleanHeaderValue(fromName))} <${cleanHeaderValue(from)}>` : cleanHeaderValue(from);
  const headers = [
    `From: ${fromHeader}`,
    `To: ${cleanHeaderValue(to)}`,
    `Subject: ${encodeMimeHeader(cleanHeaderValue(subject))}`,
  ];
  if (replyTo) headers.push(`Reply-To: ${cleanHeaderValue(replyTo)}`);
  if (inReplyTo) headers.push(`In-Reply-To: ${cleanHeaderValue(inReplyTo)}`);
  const referenceValue = [references, inReplyTo].filter(Boolean).join(' ').trim();
  if (referenceValue) headers.push(`References: ${cleanHeaderValue(referenceValue)}`);
  headers.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from(body || '', 'utf8').toString('base64'));
  return base64url(headers.join('\r\n'));
}

export function sendGmailRaw(accessToken, raw, threadId) {
  return gmailFetch(accessToken, '/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify(threadId ? { raw, threadId } : { raw }),
  });
}

export function createGmailDraft(accessToken, raw, threadId) {
  return gmailFetch(accessToken, '/gmail/v1/users/me/drafts', {
    method: 'POST',
    body: JSON.stringify({ message: threadId ? { raw, threadId } : { raw } }),
  });
}

export function updateGmailDraft(accessToken, draftId, raw, threadId) {
  return gmailFetch(accessToken, `/gmail/v1/users/me/drafts/${draftId}`, {
    method: 'PUT',
    body: JSON.stringify({ message: threadId ? { raw, threadId } : { raw } }),
  });
}

export function sendGmailDraft(accessToken, draftId) {
  return gmailFetch(accessToken, '/gmail/v1/users/me/drafts/send', {
    method: 'POST',
    body: JSON.stringify({ id: draftId }),
  });
}

export async function searchGmailMessages(accessToken, query) {
  const params = new URLSearchParams({ q: query, maxResults: '5' });
  const data = await gmailFetch(accessToken, `/gmail/v1/users/me/messages?${params.toString()}`);
  return data.messages || [];
}

export function getGmailMessage(accessToken, id) {
  return gmailFetch(accessToken, `/gmail/v1/users/me/messages/${id}?format=full`);
}

export function extractMessageSnippetAndBody(message) {
  const snippet = message.snippet || '';
  let body = '';
  function walk(part) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body += Buffer.from(part.body.data, 'base64').toString('utf8');
    } else if (part.parts) {
      part.parts.forEach(walk);
    }
  }
  walk(message.payload);
  if (!body && message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf8');
  }
  const headers = {};
  for (const h of message.payload?.headers || []) headers[h.name.toLowerCase()] = h.value;
  return { snippet, body: body || snippet, headers, threadId: message.threadId, messageId: headers['message-id'] };
}
