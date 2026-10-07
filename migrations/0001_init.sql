-- Oasis.dev phase-one D1 schema.
-- UTC timestamps stored as ISO8601 text. No PII in usage_daily.
-- No seed data. Fake businesses or projects are never inserted here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS intakes (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL CHECK (length(business_name) >= 2 AND length(business_name) <= 80),
  business_type TEXT NOT NULL CHECK (business_type IN ('home-trades','food-hospitality','health-beauty','professional-services','neighborhood-retail','tool-automation','other')),
  task_description TEXT NOT NULL CHECK (length(task_description) >= 10 AND length(task_description) <= 1000),
  frequency TEXT CHECK (frequency IS NULL OR length(frequency) <= 60),
  timeline TEXT CHECK (timeline IS NULL OR length(timeline) <= 60),
  budget TEXT CHECK (budget IS NULL OR length(budget) <= 60),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('phone','sms','whatsapp','email','tiktok','other')),
  contact_value TEXT NOT NULL CHECK (length(contact_value) >= 3 AND length(contact_value) <= 160),
  source TEXT NOT NULL CHECK (source IN ('landing','offline-admin','admin-manual')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','contacted','scoped','declined','archived')),
  email_notification TEXT NOT NULL DEFAULT 'pending' CHECK (email_notification IN ('pending','sent','failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intakes_status_created ON intakes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intakes_source ON intakes(source);

CREATE TABLE IF NOT EXISTS outreach (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL CHECK (length(business_name) >= 2 AND length(business_name) <= 120),
  contact TEXT CHECK (contact IS NULL OR length(contact) <= 160),
  channel TEXT CHECK (channel IS NULL OR length(channel) <= 60),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect','messaged','no_reply','replied','built','archived')),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  next_follow_up TEXT CHECK (next_follow_up IS NULL OR length(next_follow_up) <= 10),
  last_contact_at TEXT CHECK (last_contact_at IS NULL OR length(last_contact_at) <= 32),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX IF NOT EXISTS idx_outreach_updated ON outreach(updated_at DESC);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 80),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) >= 2 AND length(slug) <= 60),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','retired')),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  availability_note TEXT CHECK (availability_note IS NULL OR length(availability_note) <= 240),
  url TEXT CHECK (url IS NULL OR length(url) <= 500),
  business_name TEXT CHECK (business_name IS NULL OR (length(business_name) >= 2 AND length(business_name) <= 80)),
  showcase_status TEXT NOT NULL DEFAULT 'private' CHECK (showcase_status IN ('private','pending','approved','denied')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);

-- Aggregate counters only. No IP, user agent, cookie, or fingerprint columns by design.
CREATE TABLE IF NOT EXISTS usage_daily (
  id TEXT PRIMARY KEY,
  tool_id TEXT REFERENCES tools(id) ON DELETE SET NULL,
  tool_key TEXT NOT NULL CHECK (length(tool_key) >= 1 AND length(tool_key) <= 60),
  usage_date TEXT NOT NULL CHECK (length(usage_date) = 10),
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  offline_views INTEGER NOT NULL DEFAULT 0 CHECK (offline_views >= 0),
  contact_clicks INTEGER NOT NULL DEFAULT 0 CHECK (contact_clicks >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tool_key, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_daily(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tool ON usage_daily(tool_key, usage_date DESC);

CREATE TABLE IF NOT EXISTS proof_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 120),
  body TEXT CHECK (body IS NULL OR length(body) <= 4000),
  permission_status TEXT NOT NULL DEFAULT 'pending' CHECK (permission_status IN ('pending','approved','denied')),
  related_tool_id TEXT REFERENCES tools(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proof_permission ON proof_notes(permission_status, created_at DESC);

CREATE TABLE IF NOT EXISTS site_availability (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  status TEXT NOT NULL CHECK (status IN ('open','limited','waitlist','paused','closed')),
  label TEXT CHECK (label IS NULL OR length(label) <= 80),
  next_window TEXT CHECK (next_window IS NULL OR length(next_window) <= 80),
  public_note TEXT CHECK (public_note IS NULL OR length(public_note) <= 500),
  active_build_title TEXT CHECK (active_build_title IS NULL OR length(active_build_title) <= 120),
  active_build_stage TEXT CHECK (active_build_stage IS NULL OR length(active_build_stage) <= 80),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL CHECK (length(actor) <= 160),
  action TEXT NOT NULL CHECK (length(action) <= 80),
  entity TEXT NOT NULL CHECK (length(entity) <= 40),
  entity_id TEXT CHECK (entity_id IS NULL OR length(entity_id) <= 80),
  summary TEXT CHECK (summary IS NULL OR length(summary) <= 500),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
