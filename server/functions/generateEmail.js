import { InvokeLLM, isLlmConfigured } from '../llm.js';
import { buildEmailGenerationPrompt, EMAIL_GENERATION_SCHEMA, DEFAULT_TEMPLATES } from '../prompts.js';
import { applyPlaceholders, appendSignatureOnce } from '../util.js';
import { isGenericEmail } from '../emailExtract.js';
import { buildUnsubscribeUrl } from '../unsubscribe.js';

const POSITIONS = ['initial', 'value_add', 'breakup'];
const STEP_BY_POSITION = { initial: 1, value_add: 2, breakup: 3 };
const DRIP_OFFSET_DAYS = { value_add: 5, breakup: 10 };

function pickContact(prospect) {
  const contacts = Array.isArray(prospect.key_contacts) ? prospect.key_contacts : [];
  const namedWithGoodEmail = contacts.find((c) => c.name && c.email && !isGenericEmail(c.email));
  if (namedWithGoodEmail) return namedWithGoodEmail;
  if (prospect.email) return { name: '', email: prospect.email };
  const anyWithEmail = contacts.find((c) => c.email);
  if (anyWithEmail) return anyWithEmail;
  return { name: '', email: '' };
}

export async function generateEmail({ user, entities, body }) {
  const { prospect_id } = body;
  const prospect = entities.Prospect.get(prospect_id);
  if (!prospect) {
    const err = new Error('Prospect not found');
    err.status = 404;
    throw err;
  }

  const contact = pickContact(prospect);
  const placeholderValues = {
    prospect_name: prospect.name,
    facility_type: prospect.facility_type || 'business',
    facility_detail: prospect.ai_detail || prospect.company_summary || '',
    ai_reason: prospect.ai_reason || '',
    sender_name: user.sender_name || user.full_name || '',
    my_company_name: user.business_name || '',
    contact_name: contact.name || '',
    contact_first_name: (contact.name || '').split(' ')[0] || '',
    greeting_name: contact.name ? contact.name.split(' ')[0] : 'there',
  };

  const savedTemplates = entities.EmailTemplate.list();
  const templateByPosition = Object.fromEntries(
    savedTemplates.filter((t) => t.enabled).map((t) => [t.sequence_position, t]),
  );

  let aiEmails = null;
  if (isLlmConfigured()) {
    try {
      const { system, prompt } = buildEmailGenerationPrompt({ user, prospect, contact });
      const result = await InvokeLLM({ system, prompt, response_json_schema: EMAIL_GENERATION_SCHEMA, max_tokens: 1600 });
      aiEmails = Object.fromEntries((result.emails || []).map((e) => [e.position, e]));
    } catch {
      aiEmails = null;
    }
  }

  const created = [];
  for (const position of POSITIONS) {
    const template = templateByPosition[position];
    const ai = aiEmails?.[position];
    const fallback = DEFAULT_TEMPLATES[position];

    let subject;
    let body_;
    if (template) {
      subject = applyPlaceholders(template.subject, placeholderValues);
      body_ = applyPlaceholders(template.body, placeholderValues);
    } else if (ai) {
      subject = ai.subject;
      body_ = ai.body;
    } else {
      subject = applyPlaceholders(fallback.subject, placeholderValues);
      body_ = applyPlaceholders(fallback.body, placeholderValues);
    }

    body_ = appendSignatureOnce(body_, user.email_signature);

    if (contact.email) {
      const unsubscribeUrl = buildUnsubscribeUrl({ prospect_id, to_email: contact.email, owner_email: user.email });
      body_ = `${body_.trimEnd()}\n\n---\nDon't want to hear from us again? Unsubscribe: ${unsubscribeUrl}`;
    }

    const offsetDays = DRIP_OFFSET_DAYS[position];
    const scheduled_send_at = offsetDays
      ? new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const record = entities.OutreachEmail.create({
      prospect_id,
      to_email: contact.email || '',
      subject,
      body: body_,
      step: STEP_BY_POSITION[position],
      sequence_position: position,
      sent: false,
      owner_email: user.email,
      scheduled_send_at,
    });
    created.push(record);
  }

  return { email: created[0], sequence: created };
}
