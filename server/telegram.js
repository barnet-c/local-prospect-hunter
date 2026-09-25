import { findUserByEmail, findUserById, listAllUsers, updateUser } from './auth.js';
import { entitiesFor } from './entities.js';

const API_ROOT = 'https://api.telegram.org';
const chatIdToUserId = new Map();
let pollingHandle = null;
let offset = 0;

export function isTelegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

function apiUrl(method) {
  return `${API_ROOT}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function sendTelegramMessage(chatId, text) {
  if (!isTelegramConfigured() || !chatId) return;
  await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch((error) => console.error('sendTelegramMessage failed', error));
}

function tierFor(score) {
  if (score >= 8) return 'Hot';
  if (score >= 6) return 'Warm';
  if (score >= 4) return 'Cool';
  return 'Cold';
}

function classifyLeads(prospects) {
  return prospects
    .filter((p) => p.scored)
    .map((p) => ({ ...p, tier: p.ai_score >= 8 && p.email ? 'Hot' : tierFor(p.ai_score || 0) }))
    .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
}

function formatLead(p) {
  const parts = [`<b>${p.name}</b> — ${p.tier} (${p.ai_score ?? '?'}/10)`];
  if (p.facility_type) parts.push(p.facility_type);
  if (p.ai_reason) parts.push(p.ai_reason);
  return parts.join('\n');
}

function findUserByChatId(chatId) {
  return listAllUsers().find((u) => u.telegram_chat_id === String(chatId)) || null;
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = String(message.text || '').trim();

  let user = chatIdToUserId.has(chatId) ? findUserById(chatIdToUserId.get(chatId)) : findUserByChatId(chatId);
  if (user) chatIdToUserId.set(chatId, user.id);
  if (!user) {
    const found = findUserByEmail(text);
    if (!found) {
      await sendTelegramMessage(
        chatId,
        "Hi! I'm your Local Prospect Hunter assistant. What's the login email for your account?",
      );
      return;
    }
    chatIdToUserId.set(chatId, found.id);
    updateUser(found.id, { telegram_chat_id: String(chatId) });
    await sendTelegramMessage(
      chatId,
      `Connected as ${found.email}. Ask me for your "hot leads", "briefing", or "watchlist" any time.`,
    );
    return;
  }

  const entities = entitiesFor(user.id);
  const lower = text.toLowerCase();

  if (lower.includes('hot') || lower.includes('lead') || lower.includes('qualify')) {
    const leads = classifyLeads(entities.Prospect.list('-ai_score', 50)).slice(0, 10);
    if (!leads.length) {
      await sendTelegramMessage(chatId, 'No scored prospects yet — run a hunt from the app first.');
      return;
    }
    await sendTelegramMessage(chatId, leads.map(formatLead).join('\n\n'));
    return;
  }

  if (lower.includes('briefing') || lower.includes('summary')) {
    const recent = entities.Briefing.list('-created_date', 1)[0];
    await sendTelegramMessage(chatId, recent ? recent.summary : 'No briefing has been generated yet.');
    return;
  }

  if (lower.includes('watchlist')) {
    const watched = entities.Prospect.filter({ watching: true });
    if (!watched.length) {
      await sendTelegramMessage(chatId, 'Your watchlist is empty.');
      return;
    }
    await sendTelegramMessage(chatId, classifyLeads(watched).map(formatLead).join('\n\n'));
    return;
  }

  await sendTelegramMessage(chatId, 'Try asking for your "hot leads", "briefing", or "watchlist".');
}

async function poll() {
  try {
    const res = await fetch(apiUrl('getUpdates') + `?timeout=25&offset=${offset}`);
    const data = await res.json();
    for (const update of data.result || []) {
      offset = update.update_id + 1;
      if (update.message?.text) {
        await handleMessage(update.message).catch((error) => console.error('telegram handleMessage failed', error));
      }
    }
  } catch (error) {
    console.error('telegram poll failed', error);
  } finally {
    if (pollingHandle !== null) pollingHandle = setTimeout(poll, 1000);
  }
}

export function startTelegramBot() {
  if (!isTelegramConfigured() || pollingHandle !== null) return;
  pollingHandle = setTimeout(poll, 0);
  console.log('Telegram bot started (long polling).');
}

export function stopTelegramBot() {
  if (pollingHandle !== null) clearTimeout(pollingHandle);
  pollingHandle = null;
}
