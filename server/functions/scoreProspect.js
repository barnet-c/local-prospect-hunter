import { InvokeLLM, isLlmConfigured } from '../llm.js';
import { scrapeWebsite } from '../scrape.js';
import { extractEmails } from '../emailExtract.js';
import { buildScoringPrompt, SCORING_SCHEMA, NO_WEBSITE_SCORE_RESULT, UNREACHABLE_WEBSITE_SCORE_RESULT } from '../prompts.js';

export async function scoreProspect({ entities, body }) {
  const { prospect_id } = body;
  const prospect = entities.Prospect.get(prospect_id);
  if (!prospect) {
    const err = new Error('Prospect not found');
    err.status = 404;
    throw err;
  }

  if (!prospect.website) {
    return entities.Prospect.update(prospect_id, { ...NO_WEBSITE_SCORE_RESULT, scored: true, score_error: null });
  }

  const { text, reachable } = await scrapeWebsite(prospect.website);

  if (!reachable) {
    return entities.Prospect.update(prospect_id, { ...UNREACHABLE_WEBSITE_SCORE_RESULT, scored: true, score_error: null });
  }

  const emails = extractEmails(text);
  const emailPatch = !prospect.email && emails.length ? { email: emails[0] } : {};

  if (!isLlmConfigured()) {
    return entities.Prospect.update(prospect_id, {
      ...emailPatch,
      scored: true,
      score_error: 'No AI provider configured — scores unavailable.',
    });
  }

  try {
    const { system, prompt } = buildScoringPrompt({ prospect, websiteText: text });
    const result = await InvokeLLM({ system, prompt, response_json_schema: SCORING_SCHEMA, max_tokens: 1024 });
    return entities.Prospect.update(prospect_id, {
      ...emailPatch,
      ai_score: result.score,
      ai_reason: result.reason,
      ai_detail: result.detail,
      fit_score: result.fit_score,
      fit_reason: result.fit_reason,
      urgency_score: result.urgency_score,
      urgency_reason: result.urgency_reason,
      scored: true,
      score_error: null,
    });
  } catch (error) {
    return entities.Prospect.update(prospect_id, { ...emailPatch, scored: true, score_error: error.message });
  }
}
