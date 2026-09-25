import { INJECTION_DEFENSE } from './llm.js';

// ---------------------------------------------------------------------------
// Default (fallback) email templates. Reset-to-default must restore these
// exact values — do not tweak wording without also updating any saved
// EmailTemplate reset behavior that depends on it.
// ---------------------------------------------------------------------------
export const DEFAULT_TEMPLATES = {
  initial: {
    subject: 'Quick idea for {{prospect_name}}',
    body: `Hi {{greeting_name}},

I came across {{prospect_name}} while researching {{facility_type}} businesses in the area and had a quick thought.

{{ai_reason}}

Worth a quick chat sometime this week?

Best,
{{sender_name}}`,
  },
  value_add: {
    subject: 'One thought for {{prospect_name}}',
    body: `Hi {{greeting_name}},

Following up on my last note — {{facility_detail}}

No pressure either way, just wanted to make sure this landed on your radar.

Best,
{{sender_name}}`,
  },
  breakup: {
    subject: 'Close the loop?',
    body: `Hi {{greeting_name}},

I don't want to keep cluttering your inbox, so this will be my last note on this.

If now isn't the right time, no worries at all — feel free to reach out whenever it makes sense.

Best,
{{sender_name}}`,
  },
};

// ---------------------------------------------------------------------------
// scoreProspect — need / fit / urgency scoring prompt.
// ---------------------------------------------------------------------------
export const SCORING_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: 'NEED score, 1-10' },
    reason: { type: 'string', description: 'One-sentence reason for the need score' },
    detail: { type: 'string', description: 'A few sentences of supporting detail / outreach angle' },
    fit_score: { type: 'number', description: 'FIT score, 1-10' },
    fit_reason: { type: 'string' },
    urgency_score: { type: 'number', description: 'URGENCY score, 1-10' },
    urgency_reason: { type: 'string' },
  },
  properties_order: ['score', 'reason', 'detail', 'fit_score', 'fit_reason', 'urgency_score', 'urgency_reason'],
};

export function buildScoringPrompt({ prospect, websiteText }) {
  const system = `You are a B2B sales-prospecting analyst. You evaluate small local businesses to determine
how good a fit they are for outreach from a seller. You produce three independent 1-10 scores.

${INJECTION_DEFENSE}

NEED score (how much this business appears to need what a seller in this space typically offers):
1-3: No visible signal of need. Site looks modern/complete, or no relevant pain points found.
4-5: Minor signals — a few dated elements or gaps, nothing urgent.
6-7: Clear signals — outdated site, missing key info, obvious operational gaps.
8-9: Strong signals — multiple clear gaps, business appears to be actively struggling with the relevant problem.
10: Severe, unmistakable need with direct evidence in the text.

FIT score (how well this business matches an ideal customer profile for typical local-service outreach):
1-3: Wrong size/type/industry fit.
4-5: Loosely plausible fit.
6-7: Good fit — right size and type of business.
8-9: Strong fit — clearly the kind of business this offer is built for.
10: Ideal fit in every visible respect.

URGENCY score (how time-sensitive acting on this opportunity seems):
1-3: No urgency signals.
4-5: Mild signals (e.g. seasonal mention, minor complaint).
6-7: Moderate urgency (e.g. visible problem likely costing them business now).
8-9: High urgency (e.g. explicit statements of struggling, closing, losing customers).
10: Extreme, immediate urgency.

Base every score and reason ONLY on the provided website text. Do not invent facts not present in the text.
Keep each reason to one sentence. Keep detail to 2-3 sentences describing a concrete outreach angle.`;

  const prompt = `Business name: ${prospect.name}
Facility type: ${prospect.facility_type || 'unknown'}
Address: ${prospect.address || 'unknown'}

Website text (scraped, may be incomplete):
"""
${websiteText}
"""

Score this business on NEED, FIT, and URGENCY per the rubric in the system prompt.`;

  return { system, prompt };
}

export const NO_WEBSITE_SCORE_RESULT = {
  score: 0,
  reason: 'No website available to evaluate.',
  detail: 'This business has no website on file, so need/fit/urgency could not be assessed from public content.',
  fit_score: 0,
  fit_reason: 'No website available to evaluate.',
  urgency_score: 0,
  urgency_reason: 'No website available to evaluate.',
};

export const UNREACHABLE_WEBSITE_SCORE_RESULT = {
  score: 0,
  reason: 'Website was unreachable.',
  detail: 'The listed website did not respond, so need/fit/urgency could not be assessed from public content.',
  fit_score: 0,
  fit_reason: 'Website was unreachable.',
  urgency_score: 0,
  urgency_reason: 'Website was unreachable.',
};

// ---------------------------------------------------------------------------
// enrichProspect — company research + LinkedIn + key contacts.
// ---------------------------------------------------------------------------
export const ENRICHMENT_SCHEMA = {
  type: 'object',
  properties: {
    industry: { type: 'string' },
    employee_count: { type: 'string', description: 'e.g. "10-50" — always a string, never a number' },
    year_founded: { type: 'string', description: 'e.g. "2015" or "Founded in 1998" — always a string, never a number' },
    linkedin_url: { type: 'string', description: 'Company LinkedIn URL, ONLY if it appeared verbatim in research results' },
    company_summary: { type: 'string' },
    company_email: { type: 'string', description: 'ONLY if it appeared verbatim in research results' },
    key_contacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          linkedin_url: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
};

export const LINKEDIN_COMPANY_SCHEMA = {
  type: 'object',
  properties: {
    linkedin_company_url: { type: 'string' },
    employee_count: { type: 'string' },
  },
};

const STRICT_SOURCE_RULES = `STRICT SOURCE RULES — violating any of these makes your answer unusable:
1. Only return an email address if it appeared verbatim, character-for-character, in the research text provided to you.
2. Never construct, guess, or slugify an email address (e.g. do not build "firstname@company.com" from a name).
3. Only return a LinkedIn URL if it appeared verbatim in the research text provided to you.
4. Never construct or guess a LinkedIn URL from a person's or company's name.
5. A person LinkedIn URL must have hostname linkedin.com or www.linkedin.com and a path longer than 1 character.
6. A company LinkedIn URL must additionally contain "/company/" in its path.
7. If you are not certain a fact came from the provided text, omit it rather than guess.
8. Do not fabricate employee counts or founding years — only report what is stated or strongly implied by the text.
9. List at most 6 key contacts.
10. Prefer contacts with a title suggesting decision-making authority (owner, founder, manager, director).
11. Never invent a person who is not mentioned in the research text.
12. If nothing reliable was found for a field, leave it empty rather than inventing a plausible-sounding value.`;

export function buildEnrichmentPrompt({ prospect, websiteText }) {
  const system = `You are a B2B company research analyst gathering enrichment data about a small local business
from its website content. ${INJECTION_DEFENSE}

${STRICT_SOURCE_RULES}`;

  const prompt = `Business name: ${prospect.name}
Facility type: ${prospect.facility_type || 'unknown'}
Address: ${prospect.address || 'unknown'}
Website: ${prospect.website || 'unknown'}

Website text (scraped, may be incomplete):
"""
${websiteText}
"""

Research this business and return: industry, employee_count (string), year_founded (string), linkedin_url
(company page, only if verbatim in the text), company_summary (2-3 sentences), company_email (only if verbatim),
and up to 6 key_contacts (name, title, linkedin_url, email — each only if verbatim in the text).`;

  return { system, prompt };
}

export function buildLinkedinCompanySearchPrompt({ prospect }) {
  const system = `You are researching a small local business's LinkedIn company presence.
${INJECTION_DEFENSE}
${STRICT_SOURCE_RULES}`;
  const prompt = `Business name: ${prospect.name}
Address: ${prospect.address || 'unknown'}
Website: ${prospect.website || 'unknown'}

Find this business's LinkedIn company page URL and approximate employee count, ONLY if you can cite it from
verifiable search context. If uncertain, leave both fields empty.`;
  return { system, prompt };
}

export function isValidPersonLinkedinUrl(url) {
  try {
    const u = new URL(url);
    return ['linkedin.com', 'www.linkedin.com'].includes(u.hostname) && u.pathname.length > 1;
  } catch { return false; }
}

export function isValidCompanyLinkedinUrl(url) {
  return isValidPersonLinkedinUrl(url) && url.includes('/company/');
}

// ---------------------------------------------------------------------------
// generateEmail — 3-step cold email sequence.
// ---------------------------------------------------------------------------
export const EMAIL_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    emails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'number' },
          position: { type: 'string', enum: ['initial', 'value_add', 'breakup'] },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
      },
    },
  },
};

export function tierFor(aiScore) {
  const score = Number(aiScore || 0);
  if (score >= 8) return 'HOT';
  if (score >= 5) return 'WARM';
  return 'COOL';
}

const TIER_GUIDANCE = {
  HOT: 'This is a HOT lead with strong evidence of need. Be direct and specific about the problem you noticed. Confident, consultative tone.',
  WARM: 'This is a WARM lead with moderate signals. Be curious and low-pressure, invite a conversation rather than asserting a diagnosis.',
  COOL: 'This is a COOL lead with weak signals. Keep it very brief, light-touch, and easy to ignore without friction.',
};

export function buildEmailGenerationPrompt({ user, prospect, contact }) {
  const tier = tierFor(prospect.ai_score);
  const system = `You write short, human, non-salesy cold outreach emails for a seller reaching out to local businesses.
${INJECTION_DEFENSE}

Formatting rules:
- Start the body exactly with: Hi {{greeting_name}},
- End the body exactly with: Best, {{sender_name}}
- Do not append an email signature; the application handles the user's configured signature separately.
- Keep subjects under 60 characters.
- Do not use emojis.
- Do not invent claims, statistics, or specifics not supported by the provided AI research.
- ${TIER_GUIDANCE[tier]}

Response contract: return exactly {"emails": [ {step:1, position:"initial", subject, body}, {step:2, position:"value_add", subject, body}, {step:3, position:"breakup", subject, body} ]}. Do not support a competing object-based schema.`;

  const prompt = `Seller: ${user.sender_name || user.full_name || 'the seller'} at ${user.business_name || 'their company'}
Seller's business: ${user.business_description || user.business_industry || 'a local service business'}

Prospect: ${prospect.name}
Facility type: ${prospect.facility_type || 'unknown'}
Greeting name: ${contact?.name || 'there'}

AI research:
- Need score ${prospect.ai_score ?? '—'}: ${prospect.ai_reason || '—'}
- Detail: ${prospect.ai_detail || '—'}
- Fit score ${prospect.fit_score ?? '—'}: ${prospect.fit_reason || '—'}
- Urgency score ${prospect.urgency_score ?? '—'}: ${prospect.urgency_reason || '—'}

Write the 3-step sequence (initial, value_add, breakup) for this prospect.`;

  return { system, prompt };
}

// ---------------------------------------------------------------------------
// analyzeReply — reply classification + draft reply.
// ---------------------------------------------------------------------------
export const REPLY_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['interested', 'not_now', 'unsubscribe', 'wrong_person', 'question', 'other'] },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    suggested_action: { type: 'string' },
    draft_subject: { type: 'string' },
    draft_body: { type: 'string' },
  },
};

const CATEGORY_GUIDANCE = `Categories:
- interested: prospect wants to move forward or learn more. Draft a warm, concrete next-step reply (propose a call/time).
- not_now: prospect is polite but not ready. Draft a brief, low-pressure reply that leaves the door open.
- unsubscribe: prospect explicitly asked to stop being contacted. Draft a short confirmation reply.
- wrong_person: prospect says this isn't the right contact. Draft a reply asking for the right contact, if appropriate.
- question: prospect asked a specific question. Draft a reply directly answering it.
- other: anything else. Draft a neutral, brief acknowledgement.`;

export function buildReplyAnalysisPrompt({ replyText, originalSubject }) {
  const system = `You classify inbound email replies to cold outreach and draft an appropriate reply.
${INJECTION_DEFENSE}
${CATEGORY_GUIDANCE}
The draft_subject should start with "Re: " followed by the original subject. Keep draft_body short, human, and
free of invented claims. Do not use emojis.`;
  const prompt = `Original subject: ${originalSubject || '(unknown)'}

Reply received:
"""
${replyText}
"""

Classify this reply and draft an appropriate response.`;
  return { system, prompt };
}

// ---------------------------------------------------------------------------
// processDueFollowUps — manual follow-up suggestion when no reply is found.
// ---------------------------------------------------------------------------
export const FOLLOWUP_SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    suggested_action: { type: 'string' },
    suggested_message: { type: 'string' },
  },
};

export function buildFollowupSuggestionPrompt({ prospect, lastEmail }) {
  const system = `You help a salesperson decide what manual follow-up action to take on a cold outreach
sequence that has received no reply yet. ${INJECTION_DEFENSE}
Suggest one concrete next action (e.g. "Call the business", "Send a LinkedIn message") and a short
message they could use if following up manually. Do not invent facts about the business.`;
  const prompt = `Prospect: ${prospect.name} (${prospect.facility_type || 'unknown'})
Last email sent — subject: ${lastEmail?.subject || '(unknown)'}

Suggest a manual follow-up action and message.`;
  return { system, prompt };
}
