import { randomUUID } from 'node:crypto';
import { db } from './db.js';

// ---------------------------------------------------------------------------
// Schema definitions. Field type is 'string' | 'number' | 'boolean' | 'json'.
// A field may instead be { type, default } to declare a default value used
// when the field is omitted on create.
// ---------------------------------------------------------------------------
export const SCHEMAS = {
  Prospect: {
    search_id: 'string',
    name: 'string',
    address: 'string',
    phone: 'string',
    website: 'string',
    email: 'string',
    facility_type: 'string',
    place_id: 'string',
    lat: 'number',
    lng: 'number',
    ai_score: 'number',
    ai_reason: 'string',
    ai_detail: 'string',
    fit_score: 'number',
    fit_reason: 'string',
    urgency_score: 'number',
    urgency_reason: 'string',
    scored: { type: 'boolean', default: false },
    score_error: 'string',
    industry: 'string',
    employee_count: 'string',
    year_founded: 'string',
    linkedin_url: 'string',
    linkedin_company_url: 'string',
    key_contacts: { type: 'json', default: [] },
    company_summary: 'string',
    enriched: { type: 'boolean', default: false },
    enriching: { type: 'boolean', default: false },
    enriched_at: 'string',
    enrich_error: 'string',
    status: { type: 'string', default: 'new' },
    tags: { type: 'json', default: [] },
    watching: { type: 'boolean', default: false },
    last_briefed_at: 'string',
  },
  Search: {
    zip_code: 'string',
    radius_miles: 'number',
    facility_types: { type: 'json', default: [] },
    results_count: { type: 'number', default: 0 },
  },
  OutreachEmail: {
    prospect_id: 'string',
    to_email: 'string',
    subject: 'string',
    body: 'string',
    step: { type: 'number', default: 1 },
    sequence_position: { type: 'string', default: 'initial' },
    enabled: { type: 'boolean', default: true },
    owner_email: 'string',
    scheduled_send_at: 'string',
    sent: { type: 'boolean', default: false },
    sent_at: 'string',
    send_error: 'string',
  },
  FollowUp: {
    prospect_id: 'string',
    email_id: 'string',
    owner_email: 'string',
    to_email: 'string',
    due_date: 'string',
    status: { type: 'string', default: 'pending' },
    reply_detected: { type: 'boolean', default: false },
    reply_snippet: 'string',
    suggested_action: 'string',
    suggested_message: 'string',
  },
  ReplyAnalysis: {
    follow_up_id: 'string',
    prospect_id: 'string',
    owner_email: 'string',
    category: 'string',
    confidence: 'number',
    reasoning: 'string',
    suggested_action: 'string',
    draft_subject: 'string',
    draft_body: 'string',
    gmail_draft_id: 'string',
    gmail_thread_id: 'string',
    gmail_message_id: 'string',
    sent: { type: 'boolean', default: false },
    sent_at: 'string',
  },
  Briefing: {
    owner_email: 'string',
    delivered_at: 'string',
    channels: { type: 'json', default: [] },
    summary: 'string',
    stats: { type: 'json', default: {} },
    auto_hunt_search_id: 'string',
  },
  Suppression: {
    email: 'string',
    owner_email: 'string',
    reason: { type: 'string', default: 'unsubscribe' },
    source_prospect_id: 'string',
  },
  ScoreHistory: {
    prospect_id: 'string',
    ai_score: 'number',
    fit_score: 'number',
    urgency_score: 'number',
    ai_reason: 'string',
    delta_ai: 'number',
    delta_fit: 'number',
    delta_urgency: 'number',
    trigger: { type: 'string', default: 'initial' },
    signal_note: 'string',
  },
  EmailTemplate: {
    sequence_position: 'string',
    subject: 'string',
    body: 'string',
    enabled: { type: 'boolean', default: true },
  },
};

export const REQUIRED = {
  Prospect: ['name'],
  Search: ['zip_code', 'radius_miles', 'facility_types'],
  OutreachEmail: ['prospect_id'],
  FollowUp: ['prospect_id', 'email_id', 'due_date'],
  ReplyAnalysis: ['follow_up_id', 'prospect_id'],
  Briefing: ['owner_email'],
  Suppression: ['email'],
  ScoreHistory: ['prospect_id'],
  EmailTemplate: ['sequence_position', 'subject', 'body'],
};

export const ENTITY_NAMES = Object.keys(SCHEMAS);

function norm(field) {
  return typeof field === 'string' ? { type: field } : field;
}

function sqlType(fieldDef) {
  const { type } = norm(fieldDef);
  if (type === 'number') return 'REAL';
  if (type === 'boolean') return 'INTEGER';
  return 'TEXT'; // string | json
}

// ---- table creation ---------------------------------------------------------
for (const name of ENTITY_NAMES) {
  const schema = SCHEMAS[name];
  const cols = Object.entries(schema)
    .map(([field, def]) => `${field} ${sqlType(def)}`)
    .join(', ');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${name} (
      id TEXT PRIMARY KEY,
      created_by_id TEXT NOT NULL,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL,
      ${cols}
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_${name}_owner ON ${name}(created_by_id);`);
}

// ---- (de)serialization -------------------------------------------------------
function toRow(name, data) {
  const schema = SCHEMAS[name];
  const row = {};
  for (const [field, def] of Object.entries(schema)) {
    const { type } = norm(def);
    const value = data[field];
    if (value === undefined || value === null) {
      row[field] = null;
      continue;
    }
    if (type === 'json') row[field] = JSON.stringify(value);
    else if (type === 'boolean') row[field] = value ? 1 : 0;
    else if (type === 'number') row[field] = Number(value);
    else row[field] = String(value);
  }
  return row;
}

function fromRow(name, row) {
  if (!row) return null;
  const schema = SCHEMAS[name];
  const out = { id: row.id, created_by_id: row.created_by_id, created_date: row.created_date, updated_date: row.updated_date };
  for (const [field, def] of Object.entries(schema)) {
    const { type, default: dflt } = norm(def);
    const raw = row[field];
    if (raw === null || raw === undefined) {
      out[field] = dflt !== undefined ? dflt : (type === 'json' ? null : null);
      continue;
    }
    if (type === 'json') {
      try { out[field] = JSON.parse(raw); } catch { out[field] = dflt !== undefined ? dflt : null; }
    } else if (type === 'boolean') {
      out[field] = !!raw;
    } else if (type === 'number') {
      out[field] = raw === null ? null : Number(raw);
    } else {
      out[field] = raw;
    }
  }
  return out;
}

function applyDefaults(name, data) {
  const schema = SCHEMAS[name];
  const out = { ...data };
  for (const [field, def] of Object.entries(schema)) {
    const { default: dflt } = norm(def);
    if ((out[field] === undefined || out[field] === null) && dflt !== undefined) {
      out[field] = dflt;
    }
  }
  return out;
}

function validateRequired(name, data) {
  const required = REQUIRED[name] || [];
  for (const field of required) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      const err = new Error(`${field} is required`);
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
  }
}

const SORTABLE_BUILTINS = ['id', 'created_date', 'updated_date', 'created_by_id'];

function parseSort(name, sort) {
  const schema = SCHEMAS[name];
  const whitelist = new Set([...SORTABLE_BUILTINS, ...Object.keys(schema)]);
  let field = sort || '-created_date';
  let dir = 'ASC';
  if (field.startsWith('-')) { dir = 'DESC'; field = field.slice(1); }
  if (!whitelist.has(field)) field = 'created_date';
  return `${field} ${dir}`;
}

function buildWhere(name, where, ownerId) {
  const schema = SCHEMAS[name];
  const clauses = [];
  const params = [];
  if (ownerId !== null && ownerId !== undefined) {
    clauses.push('created_by_id = ?');
    params.push(ownerId);
  }
  for (const [field, value] of Object.entries(where || {})) {
    if (field === 'id' || field === 'created_by_id' || schema[field]) {
      const type = field === 'id' || field === 'created_by_id' ? 'string' : norm(schema[field]).type;
      if (value === null) {
        clauses.push(`${field} IS NULL`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) { clauses.push('1 = 0'); continue; }
        clauses.push(`${field} IN (${value.map(() => '?').join(', ')})`);
        params.push(...value.map((v) => (type === 'boolean' ? (v ? 1 : 0) : v)));
      } else if (type === 'boolean') {
        clauses.push(`${field} = ?`);
        params.push(value ? 1 : 0);
      } else {
        clauses.push(`${field} = ?`);
        params.push(value);
      }
    }
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function nowIso() {
  return new Date().toISOString();
}

export function makeEntity(name, ownerId) {
  const scoped = ownerId !== null && ownerId !== undefined;

  function list(sort, limit) {
    return filter({}, sort, limit);
  }

  function filter(where, sort, limit) {
    const { sql: whereSql, params } = buildWhere(name, where, scoped ? ownerId : null);
    const orderBy = parseSort(name, sort);
    const limitSql = limit ? `LIMIT ${Number(limit)}` : '';
    const stmt = db.prepare(`SELECT * FROM ${name} ${whereSql} ORDER BY ${orderBy} ${limitSql}`);
    const rows = stmt.all(...params);
    return rows.map((r) => fromRow(name, r));
  }

  function get(id) {
    const { sql: whereSql, params } = buildWhere(name, { id }, scoped ? ownerId : null);
    const row = db.prepare(`SELECT * FROM ${name} ${whereSql}`).get(...params);
    return fromRow(name, row);
  }

  function create(data) {
    validateRequired(name, data);
    const withDefaults = applyDefaults(name, data);
    const row = toRow(name, withDefaults);
    const id = randomUUID();
    const created_date = nowIso();
    const created_by_id = scoped ? ownerId : (data.created_by_id || 'system');
    const cols = ['id', 'created_by_id', 'created_date', 'updated_date', ...Object.keys(row)];
    const placeholders = cols.map(() => '?').join(', ');
    const values = [id, created_by_id, created_date, created_date, ...Object.values(row)];
    db.prepare(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
    return get(id);
  }

  function bulkCreate(items) {
    return items.map((item) => create(item));
  }

  function update(id, patch) {
    const existing = get(id);
    if (!existing) {
      const err = new Error(`${name} not found`);
      err.status = 404;
      err.code = 'not_found';
      throw err;
    }
    const merged = { ...existing, ...patch };
    const row = toRow(name, merged);
    const setSql = Object.keys(row).map((f) => `${f} = ?`).join(', ');
    const params = [...Object.values(row), nowIso(), id];
    db.prepare(`UPDATE ${name} SET ${setSql}, updated_date = ? WHERE id = ?`).run(...params);
    return get(id);
  }

  function del(id) {
    const existing = get(id);
    if (!existing) {
      const err = new Error(`${name} not found`);
      err.status = 404;
      err.code = 'not_found';
      throw err;
    }
    db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id);
    return { success: true };
  }

  return { list, filter, get, create, bulkCreate, update, delete: del };
}

export function entitiesFor(userId) {
  const out = {};
  for (const name of ENTITY_NAMES) out[name] = makeEntity(name, userId);
  return out;
}

export const serviceRole = entitiesFor(null);
