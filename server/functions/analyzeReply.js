import { InvokeLLM } from '../llm.js';
import { buildReplyAnalysisPrompt, REPLY_ANALYSIS_SCHEMA } from '../prompts.js';
import {
  getCurrentAppUserConnection, searchGmailMessages, getGmailMessage, extractMessageSnippetAndBody,
  buildRawEmail, createGmailDraft,
} from '../gmail.js';

export async function runReplyAnalysis({ user, entities, followUp, prospect, outreachEmail }) {
  const connection = await getCurrentAppUserConnection(user.id);
  if (!connection) {
    const err = new Error('Gmail is not connected for this account.');
    err.status = 409;
    err.code = 'gmail_not_connected';
    throw err;
  }

  const sentAtSec = Math.floor(new Date(outreachEmail.sent_at || outreachEmail.created_date).getTime() / 1000);
  const messages = await searchGmailMessages(connection.access_token, `from:${followUp.to_email} after:${sentAtSec}`);
  if (!messages.length) return null;

  const full = await getGmailMessage(connection.access_token, messages[0].id);
  const { body: replyText, headers, threadId, messageId } = extractMessageSnippetAndBody(full);

  const { system, prompt } = buildReplyAnalysisPrompt({ replyText, originalSubject: outreachEmail.subject });
  const analysis = await InvokeLLM({ system, prompt, response_json_schema: REPLY_ANALYSIS_SCHEMA, max_tokens: 800 });

  let gmailDraftId = null;
  try {
    const raw = buildRawEmail({
      from: connection.email,
      fromName: user.sender_name || user.full_name,
      to: followUp.to_email,
      subject: analysis.draft_subject || `Re: ${outreachEmail.subject}`,
      body: analysis.draft_body || '',
      inReplyTo: headers['message-id'],
      references: headers.references,
    });
    const draft = await createGmailDraft(connection.access_token, raw, threadId);
    gmailDraftId = draft.id;
  } catch (error) {
    console.error('Failed to create Gmail draft', error);
  }

  const replyAnalysis = entities.ReplyAnalysis.create({
    follow_up_id: followUp.id,
    prospect_id: prospect.id,
    owner_email: user.email,
    category: analysis.category,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    suggested_action: analysis.suggested_action,
    draft_subject: analysis.draft_subject,
    draft_body: analysis.draft_body,
    gmail_draft_id: gmailDraftId,
    gmail_thread_id: threadId,
    gmail_message_id: messageId,
    sent: false,
  });

  if (analysis.category === 'unsubscribe') {
    const email = String(followUp.to_email || '').toLowerCase();
    const existing = entities.Suppression.filter({ email }).find((s) => !s.owner_email || s.owner_email === user.email);
    if (!existing) {
      entities.Suppression.create({ email, owner_email: user.email, reason: 'ai_classified', source_prospect_id: prospect.id });
    }
    entities.Prospect.update(prospect.id, { status: 'lost' });
  }

  return { replyText, replyAnalysis };
}

export async function analyzeReply({ user, entities, body }) {
  const { follow_up_id } = body;
  const followUp = entities.FollowUp.get(follow_up_id);
  if (!followUp) {
    const err = new Error('FollowUp not found');
    err.status = 404;
    throw err;
  }
  const prospect = entities.Prospect.get(followUp.prospect_id);
  const outreachEmail = entities.OutreachEmail.get(followUp.email_id);
  if (!prospect || !outreachEmail) {
    const err = new Error('Related Prospect/OutreachEmail not found');
    err.status = 404;
    throw err;
  }

  const result = await runReplyAnalysis({ user, entities, followUp, prospect, outreachEmail });
  return result ? { found: true, ...result } : { found: false };
}
