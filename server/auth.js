import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const COOKIE = 'lph_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const JSON_FIELDS = new Set(['morning_hunt_facility_types', 'target_categories']);
const BOOLEAN_FIELDS = new Set(['briefing_enabled']);

const PATCHABLE_FIELDS = [
  'full_name',
  'avg_deal_size',
  'drip_daily_cap',
  'briefing_enabled',
  'briefing_hour',
  'briefing_timezone',
  'morning_hunt_zip',
  'morning_hunt_radius',
  'morning_hunt_facility_types',
  'telegram_chat_id',
  'business_name',
  'business_industry',
  'business_niche',
  'business_description',
  'sender_name',
  'email_signature',
  'target_categories',
];

function deserializeUser(row) {
  if (!row) return null;
  const out = { ...row };
  for (const field of JSON_FIELDS) {
    try { out[field] = JSON.parse(row[field] ?? (field === 'target_categories' ? '[]' : '[]')); } catch { out[field] = []; }
  }
  for (const field of BOOLEAN_FIELDS) out[field] = !!row[field];
  return out;
}

export function publicUser(row) {
  const user = deserializeUser(row);
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

export function findUserById(id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return deserializeUser(row);
}

export function findUserByEmail(email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  return deserializeUser(row);
}

export function listAdmins() {
  return db.prepare("SELECT * FROM users WHERE role = 'admin'").all().map(deserializeUser);
}

export function listAllUsers() {
  return db.prepare('SELECT * FROM users').all().map(deserializeUser);
}

export function updateUser(id, patch) {
  const existing = findUserById(id);
  if (!existing) {
    const err = new Error('user not found');
    err.status = 404;
    throw err;
  }
  const sets = [];
  const params = [];
  for (const field of PATCHABLE_FIELDS) {
    if (!(field in patch)) continue;
    let value = patch[field];
    if (JSON_FIELDS.has(field)) value = JSON.stringify(Array.isArray(value) ? value : []);
    else if (BOOLEAN_FIELDS.has(field)) value = value ? 1 : 0;
    sets.push(`${field} = ?`);
    params.push(value);
  }
  if (!sets.length) return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  sets.push('updated_date = ?');
  params.push(new Date().toISOString());
  params.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

export async function register({ email, password, full_name }) {
  if (!email || !EMAIL_RE.test(email)) { const e = new Error('valid email required'); e.status = 400; throw e; }
  if (!password || password.length < 8) { const e = new Error('password must be at least 8 characters'); e.status = 400; throw e; }
  if (findUserByEmail(email)) { const e = new Error('an account with that email already exists'); e.status = 409; throw e; }

  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const role = count === 0 ? 'admin' : (process.env.DEFAULT_USER_ROLE || 'admin');
  const id = randomUUID();
  const now = new Date().toISOString();
  const password_hash = await bcrypt.hash(password, 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, String(email).toLowerCase(), password_hash, full_name || null, role, now, now);

  return findUserById(id);
}

export async function login({ email, password }) {
  const user = findUserByEmail(email || '');
  if (!user) { const e = new Error('invalid email or password'); e.status = 401; throw e; }
  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) { const e = new Error('invalid email or password'); e.status = 401; throw e; }
  return user;
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

export function setSessionCookie(res, user) {
  const token = signToken(user);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE);
}

export function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = findUserById(payload.sub);
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
  next();
}
