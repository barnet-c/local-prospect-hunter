const PATHS = ['', '/contact', '/contact-us', '/about', '/about-us'];
const TIMEOUT_MS = 10_000;
const MAX_CHARS = 12_000;

function stripHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AVHunter/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBaseUrl(website) {
  if (!website) return null;
  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

// Returns { text, reachable, rawHtml } — text is truncated readable page text
// across homepage + a few likely contact/about pages, or the literal
// "Website unreachable" string when the homepage itself cannot be fetched.
export async function scrapeWebsite(website) {
  const base = normalizeBaseUrl(website);
  if (!base) return { text: 'Website unreachable', reachable: false, rawHtml: '' };

  const homepageHtml = await fetchWithTimeout(base);
  if (homepageHtml === null) return { text: 'Website unreachable', reachable: false, rawHtml: '' };

  let combined = stripHtml(homepageHtml);
  let rawHtml = homepageHtml;
  for (const path of PATHS.slice(1)) {
    if (combined.length >= MAX_CHARS) break;
    const html = await fetchWithTimeout(`${base}${path}`);
    if (html) {
      combined += `\n\n${stripHtml(html)}`;
      rawHtml += `\n\n${html}`;
    }
  }

  return { text: combined.slice(0, MAX_CHARS), reachable: true, rawHtml };
}
