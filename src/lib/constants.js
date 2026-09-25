// Score-based colors used across the Kanban board, map markers, and table pills.
export const COLORS = {
  hot: '#a3e635',
  warm: '#f97316',
  cool: '#71717a',
  cold: '#52525b',
};

export function scoreColor(score) {
  const s = Number(score || 0);
  if (s >= 8) return COLORS.hot;
  if (s >= 6) return COLORS.warm;
  if (s >= 4) return COLORS.cool;
  return COLORS.cold;
}

export function scoreRadius(score) {
  const s = Number(score || 0);
  if (s >= 8) return 10;
  if (s >= 6) return 8;
  if (s >= 4) return 6;
  return 5;
}

export function scoreTier(score) {
  const s = Number(score || 0);
  if (s >= 8) return 'Hot';
  if (s >= 6) return 'Warm';
  if (s >= 4) return 'Cool';
  return 'Cold';
}

export const TIMEZONES = [
  'Europe/Dublin', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney', 'Asia/Singapore', 'Asia/Kolkata', 'UTC',
];

export const STEP_META = {
  1: { label: 'Initial', position: 'initial' },
  2: { label: 'Value-add', position: 'value_add' },
  3: { label: 'Breakup', position: 'breakup' },
};

export const POSITION_LABEL = {
  initial: 'Initial outreach',
  value_add: 'Value-add follow-up',
  breakup: 'Breakup email',
};

export const PLACEHOLDERS = [
  { key: 'prospect_name', label: 'Business name' },
  { key: 'facility_type', label: 'Facility / business type' },
  { key: 'facility_detail', label: 'AI detail / company summary' },
  { key: 'ai_reason', label: 'AI need reason' },
  { key: 'sender_name', label: 'Your name' },
  { key: 'my_company_name', label: 'Your company name' },
  { key: 'contact_name', label: 'Contact full name' },
  { key: 'contact_first_name', label: 'Contact first name' },
  { key: 'greeting_name', label: 'Greeting name (first name or "there")' },
];

export const FOLLOWUP_STAGES = [
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
  { value: 'no_reply', label: 'No reply' },
];

export const KANBAN_COLUMNS = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

export const PRESETS = [
  { label: '5 mi', value: 5 },
  { label: '10 mi', value: 10 },
  { label: '15 mi', value: 15 },
  { label: '25 mi', value: 25 },
  { label: '50 mi', value: 50 },
];

export const DEFAULT_CATEGORIES = [
  { id: 'medical', label: 'Medical', queries: ['medical office'] },
  { id: 'law', label: 'Law Firms', queries: ['law firm'] },
  { id: 'manufacturers', label: 'Manufacturers', queries: ['manufacturer'] },
  { id: 'hotels', label: 'Hotels', queries: ['hotel'] },
  { id: 'churches', label: 'Churches', queries: ['church'] },
  { id: 'schools', label: 'Schools', queries: ['school'] },
];
