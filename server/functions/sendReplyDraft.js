import { getCurrentAppUserConnection, sendGmailDraft, updateGmailDraft, buildRawEmail } from '../gmail.js';

export async function sendReplyDraft({ user, entities, body }) {
  const { reply_analysis_id, draft_subject, draft_body } = body;
  const replyAnalysis = entities.ReplyAnalysis.get(reply_analysis_id);
  if (!replyAnalysis) {
    const err = new Error('ReplyAnalysis not found');
    err.status = 404;
    throw err;
  }
  if (replyAnalysis.sent) {
    return { success: true, already_sent: true, reply_analysis: replyAnalysis };
  }
  if (!replyAnalysis.gmail_draft_id) {
    const err = new Error('No Gmail draft is associated with this reply.');
    err.status = 400;
    err.code = 'no_draft';
    throw err;
  }

  const followUp = entities.FollowUp.get(replyAnalysis.follow_up_id);
  if (!followUp) {
    const err = new Error('Related FollowUp not found');
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

  const subject = draft_subject !== undefined ? draft_subject : replyAnalysis.draft_subject;
  const text = draft_body !== undefined ? draft_body : replyAnalysis.draft_body;
  const edited = draft_subject !== undefined || draft_body !== undefined;

  try {
    if (edited) {
      const raw = buildRawEmail({
        from: connection.email,
        fromName: user.sender_name || user.full_name,
        to: followUp.to_email,
        subject,
        body: text,
        inReplyTo: replyAnalysis.gmail_message_id,
      });
      await updateGmailDraft(connection.access_token, replyAnalysis.gmail_draft_id, raw, replyAnalysis.gmail_thread_id);
    }
    await sendGmailDraft(connection.access_token, replyAnalysis.gmail_draft_id);
  } catch (error) {
    if (error.status === 401) {
      const err = new Error('Gmail authorization expired. Please reconnect Gmail.');
      err.status = 409;
      err.code = 'gmail_not_connected';
      throw err;
    }
    throw error;
  }

  const updated = entities.ReplyAnalysis.update(reply_analysis_id, {
    draft_subject: subject,
    draft_body: text,
    sent: true,
    sent_at: new Date().toISOString(),
  });
  return { success: true, reply_analysis: updated };
}
