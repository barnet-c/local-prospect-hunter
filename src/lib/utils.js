import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function fmtDate(dateStr, pattern = 'd MMM yyyy') {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(d)) {
    const alt = new Date(dateStr);
    return isValid(alt) ? format(alt, pattern) : '—';
  }
  return format(d, pattern);
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, 'd MMM yyyy · HH:mm') : '—';
}

export function createPageUrl(pageName) {
  const [name, query] = String(pageName).split('?');
  const path = `/${name.toLowerCase()}`;
  return query ? `${path}?${query}` : path;
}
