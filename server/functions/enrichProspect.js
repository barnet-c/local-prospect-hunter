import { InvokeLLM, isLlmConfigured } from '../llm.js';
import { scrapeWebsite } from '../scrape.js';
import {
  buildEnrichmentPrompt, ENRICHMENT_SCHEMA,
  buildLinkedinCompanySearchPrompt, LINKEDIN_COMPANY_SCHEMA,
  isValidPersonLinkedinUrl, isValidCompanyLinkedinUrl,
} from '../prompts.js';
import { isStrictValidEmail } from '../emailExtract.js';

function sanitizeContacts(contacts = []) {
  return contacts
    .filter((c) => c && c.name)
    .slice(0, 6)
    .map((c) => ({
      name: c.name,
      title: c.title || '',
      linkedin_url: isValidPersonLinkedinUrl(c.linkedin_url) ? c.linkedin_url : '',
      email: isStrictValidEmail(c.email) ? c.email.toLowerCase() : '',
    }));
}

async function runEnrichment({ entities, prospect_id, prospect }) {
  try {
    const { text } = await scrapeWebsite(prospect.website);
    const [main, linkedin] = await Promise.all([
      InvokeLLM({ ...buildEnrichmentPrompt({ prospect, websiteText: text }), response_json_schema: ENRICHMENT_SCHEMA, max_tokens: 1400 }),
      InvokeLLM({ ...buildLinkedinCompanySearchPrompt({ prospect }), response_json_schema: LINKEDIN_COMPANY_SCHEMA, max_tokens: 400 }).catch(() => ({})),
    ]);

    const key_contacts = sanitizeContacts(main.key_contacts);
    const linkedin_url = isValidPersonLinkedinUrl(main.linkedin_url) ? main.linkedin_url : '';
    const linkedin_company_url = isValidCompanyLinkedinUrl(linkedin?.linkedin_company_url) ? linkedin.linkedin_company_url : '';
    const company_email = isStrictValidEmail(main.company_email) ? main.company_email.toLowerCase() : '';

    const email = prospect.email || company_email || key_contacts.find((c) => c.email)?.email || prospect.email || '';

    entities.Prospect.update(prospect_id, {
      industry: main.industry || '',
      employee_count: linkedin?.employee_count ? String(linkedin.employee_count) : (main.employee_count ? String(main.employee_count) : ''),
      year_founded: main.year_founded ? String(main.year_founded) : '',
      linkedin_url,
      linkedin_company_url,
      company_summary: main.company_summary || '',
      key_contacts,
      email,
      enriched: true,
      enriching: false,
      enriched_at: new Date().toISOString(),
      enrich_error: null,
    });
  } catch (error) {
    entities.Prospect.update(prospect_id, { enriching: false, enrich_error: error.message });
  }
}

export async function enrichProspect({ entities, body }) {
  const { prospect_id } = body;
  const prospect = entities.Prospect.get(prospect_id);
  if (!prospect) {
    const err = new Error('Prospect not found');
    err.status = 404;
    throw err;
  }
  if (!isLlmConfigured()) {
    const err = new Error('No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
    err.status = 503;
    err.code = 'llm_not_configured';
    throw err;
  }

  entities.Prospect.update(prospect_id, { enriching: true, enrich_error: null });

  // Fire-and-forget: the caller gets an immediate response; the frontend
  // polls for the Prospect update once enrichment finishes in the background.
  runEnrichment({ entities, prospect_id, prospect }).catch((error) => console.error('Enrichment failed', error));

  return { ok: true, started: true };
}
