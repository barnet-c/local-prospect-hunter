const STRICT_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const EMAIL_FIND_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function normalizeEmailObfuscation(text = '') {
  return text
    .replace(/&#64;/gi, '@')
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*/gi, '.')
    .replace(/\s*\(dot\)\s*/gi, '.');
}

const GENERIC_EMAIL_PREFIXES = new Set(['info', 'contact', 'hello', 'sales', 'office', 'admin']);

export function isGenericEmail(email) {
  const local = email.split('@')[0]?.toLowerCase();
  return GENERIC_EMAIL_PREFIXES.has(local);
}

export function sortEmailsGenericFirst(emails) {
  return [...emails].sort((a, b) => {
    const aGeneric = isGenericEmail(a) ? 0 : 1;
    const bGeneric = isGenericEmail(b) ? 0 : 1;
    if (aGeneric !== bGeneric) return aGeneric - bGeneric;
    return a.localeCompare(b);
  });
}

export function isValidScrapedEmail(email) {
  if (!STRICT_EMAIL_RE.test(email)) return false;
  if (email.length > 80) return false;
  const lower = email.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(lower)) return false;
  if (lower.includes('sentry') || lower.includes('wixpress') || lower.startsWith('noreply@') || lower.startsWith('no-reply@')) return false;
  const domain = lower.split('@')[1] || '';
  const blockedDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com'];
  if (blockedDomains.includes(domain)) return false;
  return true;
}

export function extractEmails(text = '') {
  const normalized = normalizeEmailObfuscation(text);
  const candidates = normalized.match(EMAIL_FIND_RE) || [];
  const unique = [...new Set(candidates.map((email) => email.toLowerCase()))];
  return sortEmailsGenericFirst(unique.filter(isValidScrapedEmail)).slice(0, 5);
}

export function isStrictValidEmail(email) {
  return STRICT_EMAIL_RE.test(String(email || ''));
}
