import { listAllUsers } from '../auth.js';
import { entitiesFor } from '../entities.js';
import { getCurrentAppUserConnection } from '../gmail.js';
import { runReplyAnalysis } from './analyzeReply.js';
import { InvokeLLM, isLlmConfigured } from '../llm.js';
import { buildFollowupSuggestionPrompt, FOLLOWUP_SUGGESTION_SCHEMA } from '../prompts.js';

export async function processDueFollowUps() {
  const users = listAllUsers();
  const nowIso = new Date().toISOString();
  let checked = 0;
  let repliesFound = 0;

  for (const user of users) {
    const connection = await getCurrentAppUserConnection(user.id);
    if (!connection) continue;

    const entities = entitiesFor(user.id);
    const due = entities.FollowUp.filter({ status: 'pending' }).filter((f) => f.due_date && f.due_date <= nowIso);
    for (const followUp of due) {
      const prospect = entities.Prospect.get(followUp.prospect_id);
      const outreachEmail = entities.OutreachEmail.get(followUp.email_id);
      if (!prospect || !outreachEmail) {
        entities.FollowUp.update(followUp.id, { status: 'no_reply' });
        continue;
      }

      checked += 1;
      try {
        const result = await runReplyAnalysis({ user, entities, followUp, prospect, outreachEmail });
        if (result) {
          repliesFound += 1;
          entities.FollowUp.update(followUp.id, {
            status: 'replied',
            reply_detected: true,
            reply_snippet: String(result.replyText || '').slice(0, 500),
            suggested_action: result.replyAnalysis.suggested_action,
          });
        } else {
          let suggestion = {};
          if (isLlmConfigured()) {
            try {
              const { system, prompt } = buildFollowupSuggestionPrompt({ prospect, lastEmail: outreachEmail });
              suggestion = await InvokeLLM({ system, prompt, response_json_schema: FOLLOWUP_SUGGESTION_SCHEMA, max_tokens: 300 });
            } catch (error) {
              console.error(`processDueFollowUps: suggestion failed for ${followUp.id}`, error);
            }
          }
          entities.FollowUp.update(followUp.id, {
            status: 'no_reply',
            suggested_action: suggestion.suggested_action || '',
            suggested_message: suggestion.suggested_message || '',
          });
        }
      } catch (error) {
        console.error(`processDueFollowUps: failed for follow-up ${followUp.id}`, error);
      }
    }
  }

  return { checked, replies_found: repliesFound };
}
