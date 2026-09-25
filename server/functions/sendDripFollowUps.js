import { listAllUsers } from '../auth.js';
import { entitiesFor } from '../entities.js';
import { getCurrentAppUserConnection } from '../gmail.js';
import { sendGmail } from './sendGmail.js';

export async function sendDripFollowUps() {
  const users = listAllUsers();
  const nowIso = new Date().toISOString();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const connection = await getCurrentAppUserConnection(user.id);
    if (!connection) continue;

    const entities = entitiesFor(user.id);
    const due = entities.OutreachEmail
      .filter({ sent: false, enabled: true })
      .filter((e) => ['value_add', 'breakup'].includes(e.sequence_position) && e.scheduled_send_at && e.scheduled_send_at <= nowIso && e.to_email);

    for (const outreachEmail of due) {
      try {
        await sendGmail({ user, entities, body: { email_id: outreachEmail.id } });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`sendDripFollowUps: failed to send OutreachEmail ${outreachEmail.id}`, error);
      }
    }
  }

  return { sent, failed };
}
