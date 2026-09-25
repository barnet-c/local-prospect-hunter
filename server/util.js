export function applyPlaceholders(text, values) {
  if (!text) return text;
  let out = text;
  for (const [key, value] of Object.entries(values || {})) {
    out = out.replaceAll(`{{${key}}}`, value ?? '');
  }
  return out;
}

export function appendSignatureOnce(body, signature) {
  const current = body || '';
  if (!signature) return current;
  if (current.includes(signature.trim())) return current;
  return `${current.trimEnd()}\n\n${signature}`;
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
