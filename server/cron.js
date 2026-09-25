import cron from 'node-cron';
import { sendDailyBriefing } from './functions/sendDailyBriefing.js';
import { sendDripFollowUps } from './functions/sendDripFollowUps.js';
import { processDueFollowUps } from './functions/processDueFollowUps.js';
import { rescoreWatchlist } from './functions/rescoreWatchlist.js';

function schedule(name, expression, task) {
  if (!cron.validate(expression)) {
    console.error(`Skipping cron job "${name}": invalid schedule "${expression}"`);
    return;
  }
  cron.schedule(expression, async () => {
    try {
      const result = await task();
      console.log(`[cron] ${name} completed`, result);
    } catch (error) {
      console.error(`[cron] ${name} failed`, error);
    }
  });
  console.log(`[cron] scheduled ${name} at "${expression}"`);
}

export function startScheduler() {
  schedule('sendDailyBriefing', process.env.CRON_DAILY_BRIEFING || '0 * * * *', sendDailyBriefing);
  schedule('sendDripFollowUps', process.env.CRON_DRIP_FOLLOWUPS || '0 8 * * *', sendDripFollowUps);
  schedule('processDueFollowUps', process.env.CRON_DUE_FOLLOWUPS || '0 8 * * *', processDueFollowUps);
  schedule('rescoreWatchlist', process.env.CRON_WATCHLIST_RESCORE || '0 6 * * 1', rescoreWatchlist);
}
