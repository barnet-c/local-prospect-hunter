import { listAllUsers } from '../auth.js';
import { entitiesFor } from '../entities.js';
import { scoreProspect } from './scoreProspect.js';

export async function rescoreWatchlist() {
  const users = listAllUsers();
  let rescored = 0;
  const alerts = [];

  for (const user of users) {
    const entities = entitiesFor(user.id);
    const watched = entities.Prospect.filter({ watching: true });

    for (const prospect of watched) {
      const before = {
        ai_score: prospect.ai_score || 0,
        fit_score: prospect.fit_score || 0,
        urgency_score: prospect.urgency_score || 0,
      };

      let after;
      try {
        after = await scoreProspect({ entities, body: { prospect_id: prospect.id } });
      } catch (error) {
        console.error(`rescoreWatchlist: failed for prospect ${prospect.id}`, error);
        continue;
      }
      rescored += 1;

      const delta_ai = (after.ai_score || 0) - before.ai_score;
      const delta_fit = (after.fit_score || 0) - before.fit_score;
      const delta_urgency = (after.urgency_score || 0) - before.urgency_score;

      const history = entities.ScoreHistory.create({
        prospect_id: prospect.id,
        ai_score: after.ai_score || 0,
        fit_score: after.fit_score || 0,
        urgency_score: after.urgency_score || 0,
        ai_reason: after.ai_reason || '',
        delta_ai,
        delta_fit,
        delta_urgency,
        trigger: 'watchlist_weekly',
      });

      if (Math.abs(delta_ai) >= 2 || Math.abs(delta_fit) >= 2 || Math.abs(delta_urgency) >= 2) {
        alerts.push({ owner_email: user.email, prospect, history });
      }
    }
  }

  return { rescored, alerts: alerts.length };
}
