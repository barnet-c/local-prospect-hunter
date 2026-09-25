import { listAllUsers } from '../auth.js';
import { entitiesFor } from '../entities.js';
import { getCurrentAppUserConnection, buildRawEmail, sendGmailRaw } from '../gmail.js';
import { sendTelegramMessage } from '../telegram.js';
import { runHunt } from './runHunt.js';
import { isPlacesConfigured } from '../places.js';

function localHour(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour')?.value ?? -1);
}

function localDateKey(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

function gatherStats(entities) {
  const prospects = entities.Prospect.list();
  const newProspects = prospects.filter((p) => !p.last_briefed_at);
  const hotLeads = prospects.filter((p) => (p.ai_score || 0) >= 8);
  const pendingFollowUps = entities.FollowUp.filter({ status: 'pending' });
  const unreadReplies = entities.ReplyAnalysis.filter({ sent: false });
  return { newProspects, hotLeads, pendingFollowUps, unreadReplies };
}

function composeSummary({ user, stats, autoHunt }) {
  const lines = [`Good morning${user.full_name ? `, ${user.full_name}` : ''} — here's your Local Prospect Hunter briefing:`, ''];
  if (autoHunt) lines.push(`Auto-hunt found ${autoHunt.prospects_count} new prospect(s) near ${user.morning_hunt_zip}.`);
  lines.push(`New prospects since last briefing: ${stats.newProspects.length}`);
  lines.push(`Hot leads (score 8+): ${stats.hotLeads.length}`);
  lines.push(`Follow-ups pending: ${stats.pendingFollowUps.length}`);
  lines.push(`Replies awaiting your review: ${stats.unreadReplies.length}`);
  if (stats.hotLeads.length) {
    lines.push('', 'Top hot leads:');
    for (const p of stats.hotLeads.slice(0, 5)) lines.push(`- ${p.name} (${p.ai_score}/10) — ${p.ai_reason || ''}`);
  }
  return lines.join('\n');
}

async function deliverBriefing({ user, entities, isTest }) {
  let autoHunt = null;
  if (!isTest && user.morning_hunt_zip && isPlacesConfigured()) {
    try {
      autoHunt = await runHunt({
        user,
        entities,
        body: { zip_code: user.morning_hunt_zip, radius_miles: user.morning_hunt_radius, facility_types: user.morning_hunt_facility_types },
      });
    } catch (error) {
      console.error(`sendDailyBriefing: auto-hunt failed for ${user.email}`, error);
    }
  }

  const stats = gatherStats(entities);
  const summary = composeSummary({ user, stats, autoHunt });
  const channels = [];

  const connection = await getCurrentAppUserConnection(user.id);
  if (connection) {
    try {
      const raw = buildRawEmail({
        from: connection.email,
        fromName: user.sender_name || user.full_name,
        to: connection.email,
        subject: isTest ? 'Local Prospect Hunter — Test Briefing' : 'Local Prospect Hunter — Daily Briefing',
        body: summary,
      });
      await sendGmailRaw(connection.access_token, raw);
      channels.push('email');
    } catch (error) {
      console.error(`sendDailyBriefing: email failed for ${user.email}`, error);
    }
  }

  if (user.telegram_chat_id) {
    await sendTelegramMessage(user.telegram_chat_id, summary);
    channels.push('telegram');
  }

  if (!isTest) {
    const now = new Date().toISOString();
    for (const p of stats.newProspects) entities.Prospect.update(p.id, { last_briefed_at: now });
  }

  const briefing = entities.Briefing.create({
    owner_email: user.email,
    delivered_at: new Date().toISOString(),
    channels,
    summary,
    stats: {
      new_prospects: stats.newProspects.length,
      hot_leads: stats.hotLeads.length,
      pending_follow_ups: stats.pendingFollowUps.length,
      unread_replies: stats.unreadReplies.length,
    },
    auto_hunt_search_id: autoHunt?.search_id || null,
  });

  return { briefing, channels };
}

export async function sendDailyBriefing() {
  const users = listAllUsers();
  let sent = 0;

  for (const user of users) {
    if (!user.briefing_enabled) continue;
    if (localHour(user.briefing_timezone) !== Number(user.briefing_hour)) continue;

    const entities = entitiesFor(user.id);
    const todayKey = localDateKey(user.briefing_timezone);
    const alreadySentToday = entities.Briefing.list('-created_date', 5).some(
      (b) => b.delivered_at && new Intl.DateTimeFormat('en-CA', { timeZone: user.briefing_timezone }).format(new Date(b.delivered_at)) === todayKey,
    );
    if (alreadySentToday) continue;

    try {
      await deliverBriefing({ user, entities, isTest: false });
      sent += 1;
    } catch (error) {
      console.error(`sendDailyBriefing: failed for ${user.email}`, error);
    }
  }

  return { sent };
}

export async function sendTestBriefingViaAgent({ user, entities }) {
  const { briefing, channels } = await deliverBriefing({ user, entities, isTest: true });
  if (!channels.length) {
    const err = new Error('Connect Gmail or Telegram before requesting a test briefing.');
    err.status = 409;
    throw err;
  }
  return { briefing, channels };
}
