import { getCurrentAppUserConnection, buildRawEmail, sendGmailRaw } from '../gmail.js';
import { maybeScheduleFollowUp } from './scheduleFollowUp.js';

export async function sendGmail({ user, entities, body }) {
  const { email_id, to_email } = body;
  const outreachEmail = entities.OutreachEmail.get(email_id);
  if (!outreachEmail) {
    const err = new Error('OutreachEmail not found');
    err.status = 404;
    throw err;
  }

  const connection = await getCurrentAppUserConnection(user.id);
  if (!connection) {
    const err = new Error('Gmail is not connected for this account.');
    err.status = 409;
    err.code = 'gmail_not_connected';
    throw err;
  }

  const recipient = to_email || outreachEmail.to_email;
  if (!recipient) {
    const err = new Error('No recipient email address available for this outreach email.');
    err.status = 400;
    err.code = 'no_recipient';
    throw err;
  }

  try {
    const raw = buildRawEmail({
      from: connection.email,
      fromName: user.sender_name || user.full_name,
      to: recipient,
      subject: outreachEmail.subject,
      body: outreachEmail.body,
    });
    await sendGmailRaw(connection.access_token, raw);

    const updated = entities.OutreachEmail.update(email_id, {
      to_email: recipient,
      sent: true,
      sent_at: new Date().toISOString(),
      send_error: null,
    });

    const prospect = entities.Prospect.get(updated.prospect_id);
    if (prospect) {
      await maybeScheduleFollowUp({ entities, user, outreachEmail: updated, prospect });
    }

    return { success: true, email: updated };
  } catch (error) {
    if (error.status === 401) {
      entities.OutreachEmail.update(email_id, { send_error: 'Gmail authorization expired. Please reconnect Gmail.' });
      const err = new Error('Gmail authorization expired. Please reconnect Gmail.');
      err.status = 409;
      err.code = 'gmail_not_connected';
      throw err;
    }
    entities.OutreachEmail.update(email_id, { send_error: error.message });
    throw error;
  }
}
